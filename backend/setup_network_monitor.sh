#!/bin/sh

# Setup script for network security monitoring

# Create the network monitor script
cat > /www/cgi-bin/network_monitor.sh << 'EOF'
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
  SCAN_DATA=$(timeout 30 tcpdump -c 100 -n -i eth0 "tcp[tcpflags] & (tcp-syn) != 0" 2>/dev/null)
  
  # Process the captured data
  if [ -n "$SCAN_DATA" ]; then
    # Extract unique source IPs
    SOURCES=$(echo "$SCAN_DATA" | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | sort | uniq)
    
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

# Run detection function
detect_port_scans

log "Network security monitoring completed"
EOF

# Make the script executable
chmod +x /www/cgi-bin/network_monitor.sh

# Add a cron job to run the script every 15 minutes
CRON_JOB="*/15 * * * * /www/cgi-bin/network_monitor.sh"

# Check if the cron job already exists
if ! grep -q "network_monitor.sh" /etc/crontabs/root 2>/dev/null; then
  # Add the cron job
  echo "$CRON_JOB" >> /etc/crontabs/root
  
  # Restart cron service
  /etc/init.d/cron restart
fi

echo "Network security monitoring has been set up and will run every 15 minutes."