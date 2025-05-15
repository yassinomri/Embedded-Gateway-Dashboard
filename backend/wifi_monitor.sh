#!/bin/sh

# Log file for debugging
LOG_FILE="/tmp/wifi_monitor.log"
LAST_CHECK_FILE="/tmp/wifi_last_check"
PROCESSED_EVENTS_FILE="/tmp/wifi_processed_events"
ALERTS_ENDPOINT="http://localhost/cgi-bin/security_alerts.cgi"

# Try to find the system log file
if [ -f "/var/log/messages" ]; then
  SYSLOG_FILE="/var/log/messages"
elif [ -f "/var/log/syslog" ]; then
  SYSLOG_FILE="/var/log/syslog"
elif [ -f "/var/log/system.log" ]; then
  SYSLOG_FILE="/var/log/system.log"
else
  # Create our own log file if none exists
  SYSLOG_FILE="/tmp/hostapd.log"
  touch "$SYSLOG_FILE"
fi

# Function to log messages
log() {
  echo "$(date): $1" >> $LOG_FILE
}

# Create the processed events file if it doesn't exist
if [ ! -f "$PROCESSED_EVENTS_FILE" ]; then
  touch "$PROCESSED_EVENTS_FILE"
fi

# Create the last check file if it doesn't exist
if [ ! -f "$LAST_CHECK_FILE" ]; then
  date +%s > "$LAST_CHECK_FILE"
fi

# Get timestamp of last check
LAST_CHECK=$(cat "$LAST_CHECK_FILE")
CURRENT_TIME=$(date +%s)

log "Last check: $LAST_CHECK, Current time: $CURRENT_TIME"

# Function to check if an event has been processed before
is_event_processed() {
  local event_hash="$1"
  grep -q "^$event_hash$" "$PROCESSED_EVENTS_FILE"
  return $?
}

# Function to mark an event as processed
mark_event_processed() {
  local event_hash="$1"
  echo "$event_hash" >> "$PROCESSED_EVENTS_FILE"
  
  # Keep the processed events file from growing too large (keep last 1000 events)
  if [ $(wc -l < "$PROCESSED_EVENTS_FILE") -gt 1000 ]; then
    tail -n 1000 "$PROCESSED_EVENTS_FILE" > "${PROCESSED_EVENTS_FILE}.tmp"
    mv "${PROCESSED_EVENTS_FILE}.tmp" "$PROCESSED_EVENTS_FILE"
  fi
}

# Function to add a security alert
add_alert() {
  local type="$1"
  local severity="$2"
  local message="$3"
  local source="$4"
  local details="$5"
  
  # Create a hash of this event to avoid duplicates
  local event_hash=$(echo "$type:$severity:$message:$source:$details" | md5sum | cut -d' ' -f1)
  
  # Check if we've already processed this exact event recently
  if is_event_processed "$event_hash"; then
    log "Skipping duplicate event: $message from $source"
    return
  fi
  
  # Create JSON payload
  local payload="{\"action\":\"add\",\"type\":\"$type\",\"severity\":\"$severity\",\"message\":\"$message\",\"source\":\"$source\",\"details\":\"$details\"}"
  
  # Try to send to security alerts endpoint using curl if available
  if command -v curl > /dev/null; then
    curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$ALERTS_ENDPOINT" >> "$LOG_FILE" 2>&1
  else
    # Fallback method using wget if curl is not available
    if command -v wget > /dev/null; then
      log "Using wget as fallback for curl"
      # Create a temporary file for the payload
      local tmp_file=$(mktemp)
      echo "$payload" > "$tmp_file"
      
      # Use wget to send the POST request
      wget -q -O - --header="Content-Type: application/json" --post-file="$tmp_file" "$ALERTS_ENDPOINT" >> "$LOG_FILE" 2>&1
      
      # Remove the temporary file
      rm "$tmp_file"
    else
      # Direct file manipulation as last resort
      log "Neither curl nor wget available, using direct file manipulation"
      
      # Path to the alerts database file
      local ALERTS_DB="/tmp/security_alerts.json"
      
      # Create the alerts file if it doesn't exist
      if [ ! -f "$ALERTS_DB" ]; then
        echo '{"alerts":[]}' > "$ALERTS_DB"
      fi
      
      # Generate a unique ID and timestamp
      local ID="$(date +%s)$RANDOM"
      local TIMESTAMP=$(date -Iseconds)
      
      # Create new alert JSON
      local NEW_ALERT="{\"id\":\"$ID\",\"type\":\"$type\",\"severity\":\"$severity\",\"message\":\"$message\",\"source\":\"$source\",\"details\":\"$details\",\"timestamp\":\"$TIMESTAMP\",\"resolved\":false}"
      
      # Add to alerts database using a temporary file
      local TMP_FILE=$(mktemp)
      
      # If jq is available, use it for proper JSON manipulation
      if command -v jq > /dev/null; then
        jq ".alerts += [$NEW_ALERT]" "$ALERTS_DB" > "$TMP_FILE" && mv "$TMP_FILE" "$ALERTS_DB"
      else
        # Very basic JSON manipulation without jq (not ideal but better than nothing)
        # Remove the closing bracket, add the new alert, and close the JSON
        sed 's/]}$//' "$ALERTS_DB" > "$TMP_FILE"
        if grep -q "alerts" "$TMP_FILE"; then
          # If there are existing alerts, add a comma
          echo "," >> "$TMP_FILE"
        fi
        echo "$NEW_ALERT]}" >> "$TMP_FILE"
        mv "$TMP_FILE" "$ALERTS_DB"
      fi
    fi
  fi
  
  # Mark this event as processed to avoid duplicates
  mark_event_processed "$event_hash"
  
  log "Added alert: $message from $source"
}

# Check for failed WiFi authentication attempts in hostapd log
check_wifi_auth_failures() {
  # First, let's dump the recent log entries to help debug
  log "Recent log entries from logread:"
  logread | grep -i "hostapd\|wifi\|wlan\|auth" | tail -n 50 >> "$LOG_FILE"
  
  # Look for failed PSK authentication attempts since last check
  AUTH_FAILURES=$(logread | grep "AP-STA-POSSIBLE-PSK-MISMATCH")
  
  if [ -n "$AUTH_FAILURES" ]; then
    log "Found authentication failures: $AUTH_FAILURES"
    
    # Process each unique MAC address only once
    PROCESSED_MACS=""
    
    echo "$AUTH_FAILURES" | grep -v "^$" | while read -r line; do
      # Extract MAC address using a more flexible pattern
      MAC=$(echo "$line" | grep -o -E "([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})" | head -1)
      
      if [ -n "$MAC" ]; then
        # Check if we've already processed this MAC in this run
        if echo "$PROCESSED_MACS" | grep -q "$MAC"; then
          continue
        fi
        
        # Add to processed MACs
        PROCESSED_MACS="$PROCESSED_MACS $MAC"
        
        # Count failures for this MAC
        COUNT=$(echo "$AUTH_FAILURES" | grep "$MAC" | wc -l)
        
        # Report even a single failed attempt
        if [ "$COUNT" -ge 1 ]; then
          # Adjust severity based on count
          SEVERITY="low"
          if [ "$COUNT" -ge 5 ]; then
            SEVERITY="high"
          elif [ "$COUNT" -ge 3 ]; then
            SEVERITY="medium"
          fi
          
          add_alert "wifi" "$SEVERITY" "Failed Wi-Fi authentication attempt" "$MAC" "$COUNT failed attempt(s) with incorrect password"
          log "Reported $COUNT failed attempt(s) from MAC $MAC"
        fi
      else
        log "Could not extract MAC address from line: $line"
      fi
    done
  else
    log "No authentication failures found using PSK-MISMATCH pattern"
  fi
}

# Main execution
log "Starting WiFi monitor"

# Run the checks
check_wifi_auth_failures

# Update the last check time
echo "$CURRENT_TIME" > "$LAST_CHECK_FILE"
log "Updated last check time to $CURRENT_TIME"

log "WiFi monitor completed"









