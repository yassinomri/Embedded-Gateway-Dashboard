#!/bin/sh

# Log file for debugging
LOG_FILE="/tmp/wifi_monitor.log"
LAST_CHECK_FILE="/tmp/wifi_last_check"
ALERTS_ENDPOINT="http://localhost/cgi-bin/security_alerts.cgi"
SYSLOG_FILE="/var/log/messages"  # Changed from /var/log/syslog to /var/log/messages

# Function to log messages
log() {
  echo "$(date): $1" >> $LOG_FILE
}

log "WiFi monitor started"

# Create last check file if it doesn't exist
if [ ! -f "$LAST_CHECK_FILE" ]; then
  # If the file doesn't exist (e.g., after reboot), use current time minus 600 seconds (10 minutes)
  # This prevents false positives from old log entries after a reboot
  echo $(($(date +%s) - 600)) > "$LAST_CHECK_FILE"
  log "Created new last check file with timestamp from 10 minutes ago"
fi

# Get timestamp of last check
LAST_CHECK=$(cat "$LAST_CHECK_FILE")
CURRENT_TIME=$(date +%s)

log "Last check: $LAST_CHECK, Current time: $CURRENT_TIME"

# Function to add a security alert
add_alert() {
  local type="$1"
  local severity="$2"
  local message="$3"
  local source="$4"
  local details="$5"
  
  # Create JSON payload
  local payload="{\"action\":\"add\",\"type\":\"$type\",\"severity\":\"$severity\",\"message\":\"$message\",\"source\":\"$source\",\"details\":\"$details\"}"
  
  # Send to security alerts endpoint
  curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$ALERTS_ENDPOINT" >> "$LOG_FILE" 2>&1
  
  log "Added alert: $message from $source"
}

# Check for failed WiFi authentication attempts in hostapd log
check_wifi_auth_failures() {
  # Get logs since last check
  # Check if syslog file exists
  if [ ! -f "$SYSLOG_FILE" ]; then
    log "Syslog file $SYSLOG_FILE not found"
    return
  fi
  
  # Note: This uses grep on syslog, adjust based on your system's logging setup
  AUTH_FAILURES=$(grep -a "hostapd" "$SYSLOG_FILE" | grep -a "authentication failed" | awk -v last="$LAST_CHECK" '$1 > last {print}')
  
  if [ -n "$AUTH_FAILURES" ]; then
    log "Found authentication failures: $AUTH_FAILURES"
    
    # Count failures by MAC address
    echo "$AUTH_FAILURES" | while read -r line; do
      # Extract MAC address and timestamp
      MAC=$(echo "$line" | grep -o -E "([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})" | head -1)
      TIMESTAMP=$(echo "$line" | awk '{print $1}')
      
      if [ -n "$MAC" ]; then
        # Count failures for this MAC
        COUNT=$(echo "$AUTH_FAILURES" | grep "$MAC" | wc -l)
        
        # Only alert if there are multiple failures (3 or more)
        if [ "$COUNT" -ge 3 ]; then
          add_alert "wifi" "medium" "Multiple failed Wi-Fi authentication attempts" "$MAC" "$COUNT failed attempts with incorrect password"
          log "Reported $COUNT failed attempts from MAC $MAC"
        fi
      fi
    done
  else
    log "No authentication failures found"
  fi
}

# Check for deauthentication attacks (multiple deauth packets)
check_deauth_attacks() {
  # Check if syslog file exists
  if [ ! -f "$SYSLOG_FILE" ]; then
    log "Syslog file $SYSLOG_FILE not found"
    return
  fi
  
  # This would typically use a tool like airmon-ng or tcpdump to detect deauth packets
  # For simplicity, we'll just check syslog for deauth messages
  DEAUTH_EVENTS=$(grep -a "hostapd" "$SYSLOG_FILE" | grep -a "deauthentication" | awk -v last="$LAST_CHECK" '$1 > last {print}')
  
  if [ -n "$DEAUTH_EVENTS" ]; then
    log "Found deauthentication events: $DEAUTH_EVENTS"
    
    # Count deauth events by MAC address
    echo "$DEAUTH_EVENTS" | while read -r line; do
      # Extract MAC address
      MAC=$(echo "$line" | grep -o -E "([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})" | head -1)
      
      if [ -n "$MAC" ]; then
        # Count deauth events for this MAC
        COUNT=$(echo "$DEAUTH_EVENTS" | grep "$MAC" | wc -l)
        
        # Alert if there are many deauth events (potential attack)
        if [ "$COUNT" -ge 10 ]; then
          add_alert "wifi" "high" "Possible deauthentication attack detected" "$MAC" "$COUNT deauthentication events detected in short period"
          log "Reported possible deauth attack from MAC $MAC"
        fi
      fi
    done
  else
    log "No deauthentication events found"
  fi
}

# Run checks
check_wifi_auth_failures
check_deauth_attacks

# Update last check time
echo "$CURRENT_TIME" > "$LAST_CHECK_FILE"
log "Updated last check time to $CURRENT_TIME"

log "WiFi monitor completed"


