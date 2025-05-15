#!/bin/sh

# Set content type to JSON and CORS headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo ""

# Debug: Print environment variables to error log
env > /tmp/cgi_env.log

# Path to the alerts database file
ALERTS_DB="/tmp/security_alerts.json"

# Debug: Check if file exists and print its content to a log
if [ -f "$ALERTS_DB" ]; then
  echo "File exists" > /tmp/cgi_debug.log
  cat "$ALERTS_DB" >> /tmp/cgi_debug.log
else
  echo "File does not exist" > /tmp/cgi_debug.log
fi

# Create the alerts file if it doesn't exist
if [ ! -f "$ALERTS_DB" ]; then
  echo '{"alerts":[]}' > "$ALERTS_DB"
fi

# Function to generate a unique ID
generate_id() {
  echo $(date +%s)$RANDOM
}

# Debug: Log request method
echo "REQUEST_METHOD: $REQUEST_METHOD" >> /tmp/cgi_debug.log

# If REQUEST_METHOD is not set (direct command line execution), default to GET
if [ -z "$REQUEST_METHOD" ]; then
  REQUEST_METHOD="GET"
  echo "REQUEST_METHOD not set, defaulting to GET" >> /tmp/cgi_debug.log
fi

# Parse the request
if [ "$REQUEST_METHOD" = "POST" ]; then
  # Read POST data
  read -n $CONTENT_LENGTH POSTDATA
  echo "POST data: $POSTDATA" >> /tmp/cgi_debug.log

  # Extract action from JSON
  ACTION=$(echo "$POSTDATA" | grep -o '"action":"[^"]*"' | cut -d'"' -f4)
  echo "Action: $ACTION" >> /tmp/cgi_debug.log
  
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
  echo "QUERY_STRING: $QUERY_STRING" >> /tmp/cgi_debug.log
  
  # Default values
  LIMIT=10
  INCLUDE_RESOLVED=false
  
  # Parse query parameters if QUERY_STRING is set
  if [ -n "$QUERY_STRING" ]; then
    QUERY_PARAMS=$(echo "$QUERY_STRING" | tr '&' '\n')
    
    for param in $QUERY_PARAMS; do
      case "$param" in
        limit=*)
          LIMIT=$(echo "$param" | cut -d'=' -f2)
          ;;
        includeResolved=*)
          INCLUDE_RESOLVED=$(echo "$param" | cut -d'=' -f2)
          ;;
      esac
    done
  fi
  
  echo "LIMIT: $LIMIT, INCLUDE_RESOLVED: $INCLUDE_RESOLVED" >> /tmp/cgi_debug.log
  
  # Get alerts from database - using a simpler jq approach without the limit function
  if [ "$INCLUDE_RESOLVED" = "true" ]; then
    # Include all alerts - sort by timestamp in reverse order
    echo "Running jq for all alerts" >> /tmp/cgi_debug.log
    JQ_RESULT=$(jq "{\"alerts\": .alerts | sort_by(.timestamp) | reverse}" "$ALERTS_DB")
    JQ_STATUS=$?
    echo "JQ exit status: $JQ_STATUS" >> /tmp/cgi_debug.log
    echo "JQ result (all): $JQ_RESULT" >> /tmp/cgi_debug.log
    echo "$JQ_RESULT"
  else
    # Only include unresolved alerts - sort by timestamp in reverse order
    echo "Running jq for unresolved alerts" >> /tmp/cgi_debug.log
    JQ_RESULT=$(jq "{\"alerts\": .alerts | map(select(.resolved == false)) | sort_by(.timestamp) | reverse}" "$ALERTS_DB")
    JQ_STATUS=$?
    echo "JQ exit status: $JQ_STATUS" >> /tmp/cgi_debug.log
    echo "JQ result (unresolved): $JQ_RESULT" >> /tmp/cgi_debug.log
    echo "$JQ_RESULT"
  fi
  
  # If we got here but didn't output anything, output the file directly as a fallback
  if [ -z "$JQ_RESULT" ]; then
    echo "JQ result was empty, outputting file directly" >> /tmp/cgi_debug.log
    cat "$ALERTS_DB"
  fi
fi

# If we got here but didn't output anything, output an error
if [ -z "$JQ_RESULT" ]; then
  echo "No output generated, returning error JSON" >> /tmp/cgi_debug.log
  echo '{"error": "No data returned", "alerts": []}'
fi



