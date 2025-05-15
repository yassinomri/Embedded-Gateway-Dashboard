#!/bin/sh

# Log file for setup
SETUP_LOG="/tmp/security_alerts_setup.log"

# Function to log messages
log() {
  echo "$(date): $1" | tee -a $SETUP_LOG
}

log "Starting security alerts setup"

# Create the security alerts CGI script
cat > /www/cgi-bin/security_alerts.cgi << 'EOF'
#!/bin/sh

# Set content type to JSON
echo "Content-Type: application/json"
echo ""

# Path to the alerts database file
ALERTS_DB="/tmp/security_alerts.json"

# Create the alerts file if it doesn't exist
if [ ! -f "$ALERTS_DB" ]; then
  echo '{"alerts":[]}' > "$ALERTS_DB"
fi

# Function to generate a unique ID
generate_id() {
  echo $(date +%s)$RANDOM
}

# Parse the request
if [ "$REQUEST_METHOD" = "POST" ]; then
  # Read POST data
  read -n $CONTENT_LENGTH POSTDATA

  # Extract action from JSON
  ACTION=$(echo "$POSTDATA" | grep -o '"action":"[^"]*"' | cut -d'"' -f4)
  
  if [ "$ACTION" = "add" ]; then
    # Extract alert details from JSON
    TYPE=$(echo "$POSTDATA" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
    SEVERITY=$(echo "$POSTDATA" | grep -o '"severity":"[^"]*"' | cut -d'"' -f4)
    MESSAGE=$(echo "$POSTDATA" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    SOURCE=$(echo "$POSTDATA" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)
    DETAILS=$(echo "$POSTDATA" | grep -o '"details":"[^"]*"' | cut -d'"' -f4)
    
    # Generate a unique ID and timestamp
    ID=$(generate_id)
    TIMESTAMP=$(date -Iseconds)
    
    # Create new alert JSON
    NEW_ALERT="{\"id\":\"$ID\",\"type\":\"$TYPE\",\"severity\":\"$SEVERITY\",\"message\":\"$MESSAGE\",\"source\":\"$SOURCE\",\"details\":\"$DETAILS\",\"timestamp\":\"$TIMESTAMP\",\"resolved\":false}"
    
    # Add to alerts database
    TMP_FILE=$(mktemp)
    jq ".alerts += [$NEW_ALERT]" "$ALERTS_DB" > "$TMP_FILE" && mv "$TMP_FILE" "$ALERTS_DB"
    
    # Return the new alert
    echo "$NEW_ALERT"
    
  elif [ "$ACTION" = "resolve" ]; then
    # Extract alert ID from JSON
    ID=$(echo "$POSTDATA" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    # Mark alert as resolved
    TMP_FILE=$(mktemp)
    jq ".alerts |= map(if .id == \"$ID\" then .resolved = true else . end)" "$ALERTS_DB" > "$TMP_FILE" && mv "$TMP_FILE" "$ALERTS_DB"
    
    # Return success
    echo "{\"success\":true,\"id\":\"$ID\"}"
    
  elif [ "$ACTION" = "delete" ]; then
    # Extract alert ID from JSON
    ID=$(echo "$POSTDATA" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    # Delete alert
    TMP_FILE=$(mktemp)
    jq ".alerts |= map(select(.id != \"$ID\"))" "$ALERTS_DB" > "$TMP_FILE" && mv "$TMP_FILE" "$ALERTS_DB"
    
    # Return success
    echo "{\"success\":true,\"id\":\"$ID\"}"
  fi
  
elif [ "$REQUEST_METHOD" = "GET" ]; then
  # Extract query parameters
  QUERY_STRING=$(echo "$QUERY_STRING" | tr '&' '\n')
  
  # Default values
  LIMIT=10
  INCLUDE_RESOLVED=false
  
  # Parse query parameters
  for param in $QUERY_STRING; do
    case "$param" in
      limit=*)
        LIMIT=$(echo "$param" | cut -d'=' -f2)
        ;;
      includeResolved=*)
        INCLUDE_RESOLVED=$(echo "$param" | cut -d'=' -f2)
        ;;
    esac
  done
  
  # Get alerts from database
  if [ "$INCLUDE_RESOLVED" = "true" ]; then
    # Include all alerts
    jq "{alerts: .alerts | sort_by(.timestamp) | reverse | limit($LIMIT)}" "$ALERTS_DB"
  else
    # Only include unresolved alerts
    jq "{alerts: .alerts | map(select(.resolved == false)) | sort_by(.timestamp) | reverse | limit($LIMIT)}" "$ALERTS_DB"
  fi
fi
EOF

# Make the script executable
chmod +x /www/cgi-bin/security_alerts.cgi
log "Created and made executable: /www/cgi-bin/security_alerts.cgi"

# Install jq if not already installed
if ! command -v jq > /dev/null; then
  log "Installing jq package for JSON processing"
  opkg update
  opkg install jq
  
  if command -v jq > /dev/null; then
    log "jq installed successfully"
  else
    log "WARNING: Failed to install jq. The security alerts system may not work properly."
  fi
else
  log "jq is already installed"
fi

# Create initial empty alerts database
echo '{"alerts":[]}' > /tmp/security_alerts.json
log "Created initial empty alerts database at /tmp/security_alerts.json"

# Test the CGI script
log "Testing the security alerts CGI script"
TEST_RESULT=$(REQUEST_METHOD=GET QUERY_STRING="limit=1" /www/cgi-bin/security_alerts.cgi)
if echo "$TEST_RESULT" | grep -q "alerts"; then
  log "CGI script test successful"
else
  log "WARNING: CGI script test failed. Output: $TEST_RESULT"
fi

log "Security alerts setup complete"
log "Setup log saved to $SETUP_LOG"