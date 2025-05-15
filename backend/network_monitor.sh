#!/bin/sh

# Network security monitoring script
# Detects port scans, unusual traffic, and potential intrusions

# Log file for debugging
LOG_FILE="/tmp/network_monitor.log"
ALERTS_ENDPOINT="http://localhost/cgi-bin/security_alerts.cgi"

# Function to log messages
log() {
  echo "$(date): $1" >> $LOG_FILE
}

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

# Function to detect port scans
detect_port_scans() {
  log "Starting port scan detection"
  
  # Run tcpdump for a short period to capture SYN packets (typical for port scans)
  # -c 100: Capture up to 100 packets
  # -n: Don't resolve hostnames
  # -i eth0: Monitor the main interface
  # tcp[tcpflags] & (tcp-syn) != 0: Only capture SYN packets
  SCAN_DATA=$(timeout 30 tcpdump -c 100 -n -i eth0 "tcp[tcpflags] & (tcp-syn) != 0" 2>/dev/null)
  
  # Process the captured data
  if [ -n "$SCAN_DATA" ]; then
    # Extract unique source IPs
    SOURCES=$(echo "$SCAN_DATA" | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}\.[0-9]{1,3}" | sort | uniq)
    
    for src in $SOURCES; do
      # Count how many different ports this source tried to connect to
      PORT_COUNT=$(echo "$SCAN_DATA" | grep "$src" | grep -o -E "\.([0-9]{1,5})" | sort | uniq | wc -l)
      
      # If a single source tried to connect to multiple ports in a short time, it might be a port scan
      if [ "$PORT_COUNT" -gt 5 ]; then
        SEVERITY="medium"
        [ "$PORT_COUNT" -gt 15 ] && SEVERITY="high"
        
        add_alert "network" "$SEVERITY" "Possible port scan detected" "$src" "Attempted to connect to $PORT_COUNT different ports in a short period"
      fi
    done
  fi
}

# Function to detect unusual traffic patterns
detect_unusual_traffic() {
  log "Starting unusual traffic detection"
  
  # Run tcpdump to capture a sample of traffic
  TRAFFIC_SAMPLE=$(timeout 60 tcpdump -c 200 -n -i eth0 2>/dev/null)
  
  # Check for unusual protocols or traffic patterns
  if echo "$TRAFFIC_SAMPLE" | grep -q "ICMP echo request"; then
    # Count ICMP requests (potential ping flood)
    PING_COUNT=$(echo "$TRAFFIC_SAMPLE" | grep "ICMP echo request" | wc -l)
    
    if [ "$PING_COUNT" -gt 20 ]; then
      # Extract the source of the pings
      PING_SOURCE=$(echo "$TRAFFIC_SAMPLE" | grep "ICMP echo request" | head -1 | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | head -1)
      
      SEVERITY="low"
      [ "$PING_COUNT" -gt 50 ] && SEVERITY="medium"
      [ "$PING_COUNT" -gt 100 ] && SEVERITY="high"
      
      add_alert "network" "$SEVERITY" "Possible ping flood detected" "$PING_SOURCE" "Received $PING_COUNT ICMP echo requests in a short period"
    fi
  fi
  
  # Check for unusual UDP traffic (potential UDP flood)
  if echo "$TRAFFIC_SAMPLE" | grep -q "UDP"; then
    UDP_COUNT=$(echo "$TRAFFIC_SAMPLE" | grep "UDP" | wc -l)
    
    if [ "$UDP_COUNT" -gt 50 ]; then
      # Extract the most common source
      UDP_SOURCE=$(echo "$TRAFFIC_SAMPLE" | grep "UDP" | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | sort | uniq -c | sort -nr | head -1 | awk '{print $2}')
      
      SEVERITY="medium"
      [ "$UDP_COUNT" -gt 100 ] && SEVERITY="high"
      
      add_alert "network" "$SEVERITY" "Unusual UDP traffic detected" "$UDP_SOURCE" "Received $UDP_COUNT UDP packets in a short period"
    fi
  fi
}

# Function to detect potential intrusion attempts
detect_intrusion_attempts() {
  log "Starting intrusion detection"
  
  # Look for common attack signatures in traffic
  INTRUSION_SAMPLE=$(timeout 60 tcpdump -c 200 -n -i eth0 -A 2>/dev/null)
  
  # Check for SQL injection attempts
  if echo "$INTRUSION_SAMPLE" | grep -q -i "union\s*select\|select.*from\|insert\s*into\|drop\s*table"; then
    # Extract the source IP
    SQL_SOURCE=$(echo "$INTRUSION_SAMPLE" | grep -i "union\s*select\|select.*from\|insert\s*into\|drop\s*table" | head -1 | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | head -1)
    
    add_alert "security" "high" "Possible SQL injection attempt" "$SQL_SOURCE" "Traffic contains SQL-like commands"
  fi
  
  # Check for command injection attempts
  if echo "$INTRUSION_SAMPLE" | grep -q -i "\/bin\/sh\|\/bin\/bash\|cmd\.exe\|powershell\|wget\s*http"; then
    # Extract the source IP
    CMD_SOURCE=$(echo "$INTRUSION_SAMPLE" | grep -i "\/bin\/sh\|\/bin\/bash\|cmd\.exe\|powershell\|wget\s*http" | head -1 | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | head -1)
    
    add_alert "security" "high" "Possible command injection attempt" "$CMD_SOURCE" "Traffic contains shell commands or executables"
  fi
}

# Main execution
log "Starting network security monitoring"

# Run detection functions
detect_port_scans
detect_unusual_traffic
detect_intrusion_attempts

log "Network security monitoring completed"