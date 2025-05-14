#!/bin/sh

# Debug log
LOG_FILE="/tmp/security_alerts_cgi.log"
echo "$(date): security_alerts.cgi started, REQUEST_METHOD=$REQUEST_METHOD" >> $LOG_FILE

# Send CORS headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "$(date): OPTIONS request - CORS preflight" >> $LOG_FILE
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Path to store alerts
ALERTS_FILE="/tmp/security_alerts.json"

# Create alerts file if it doesn't exist
if [ ! -f "$ALERTS_FILE" ]; then
    echo "[]" > "$ALERTS_FILE"
    echo "$(date): Created new alerts file" >> $LOG_FILE
fi

# Function to generate a unique ID
generate_id() {
    date +%s%N | md5sum | head -c 8
}

# Function to add a new alert
add_alert() {
    local type="$1"
    local severity="$2"
    local message="$3"
    local source="$4"
    local details="$5"
    
    # Generate ID and timestamp
    local id=$(generate_id)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create new alert JSON
    local new_alert="{\"id\":\"$id\",\"type\":\"$type\",\"severity\":\"$severity\",\"message\":\"$message\",\"timestamp\":\"$timestamp\",\"source\":\"$source\",\"details\":\"$details\",\"resolved\":false}"
    
    # Read existing alerts
    local alerts=$(cat "$ALERTS_FILE")
    
    # Add new alert to beginning of array
    local updated_alerts=$(echo "$alerts" | sed 's/\[/['"$new_alert"',/')
    
    # If alerts was empty, handle special case
    if [ "$alerts" = "[]" ]; then
        updated_alerts="[$new_alert]"
    fi
    
    # Write updated alerts back to file
    echo "$updated_alerts" > "$ALERTS_FILE"
    
    echo "$(date): Added new alert: $type, $severity, $message" >> $LOG_FILE
    
    # Return the new alert
    echo "$new_alert"
}

# Function to get all alerts
get_alerts() {
    local limit="$1"
    local include_resolved="$2"
    
    # Read alerts from file
    local alerts=$(cat "$ALERTS_FILE")
    
    # Filter out resolved alerts if needed
    if [ "$include_resolved" != "true" ]; then
        # This is a simplified approach - in a real implementation, use a proper JSON parser
        alerts=$(echo "$alerts" | grep -v '"resolved":true')
    fi
    
    # Limit number of alerts if specified
    if [ -n "$limit" ] && [ "$limit" -gt 0 ]; then
        # This is a simplified approach - in a real implementation, use a proper JSON parser
        alerts=$(echo "$alerts" | head -n "$limit")
    fi
    
    echo "$alerts"
}

# Function to mark an alert as resolved
resolve_alert() {
    local alert_id="$1"
    
    # Read existing alerts
    local alerts=$(cat "$ALERTS_FILE")
    
    # Replace "resolved":false with "resolved":true for the specified alert
    local updated_alerts=$(echo "$alerts" | sed 's/\("id":"'"$alert_id"'",.*"resolved":\)false/\1true/')
    
    # Write updated alerts back to file
    echo "$updated_alerts" > "$ALERTS_FILE"
    
    echo "$(date): Marked alert $alert_id as resolved" >> $LOG_FILE
}

# Handle GET request to retrieve alerts
if [ "$REQUEST_METHOD" = "GET" ]; then
    echo "$(date): GET request" >> $LOG_FILE
    
    # Parse query parameters
    QUERY_STRING="${QUERY_STRING:-}"
    
    # Extract limit parameter
    limit=$(echo "$QUERY_STRING" | grep -o "limit=[0-9]*" | cut -d= -f2)
    [ -z "$limit" ] && limit=10
    
    # Extract include_resolved parameter
    include_resolved=$(echo "$QUERY_STRING" | grep -o "include_resolved=true" | cut -d= -f2)
    [ -z "$include_resolved" ] && include_resolved="false"
    
    echo "$(date): GET params - limit=$limit, include_resolved=$include_resolved" >> $LOG_FILE
    
    # Get alerts
    alerts=$(get_alerts "$limit" "$include_resolved")
    
    # Return alerts
    echo "{\"status\": \"success\", \"alerts\": $alerts}"
    exit 0
fi

# Handle POST request to add or update alerts
if [ "$REQUEST_METHOD" = "POST" ]; then
    echo "$(date): POST request" >> $LOG_FILE
    
    # Read POST data
    read -r POST_DATA
    echo "$(date): POST_DATA=$POST_DATA" >> $LOG_FILE
    
    # Parse action
    action=$(echo "$POST_DATA" | sed -n 's/.*"action"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    echo "$(date): Action: $action" >> $LOG_FILE
    
    if [ "$action" = "add" ]; then
        # Parse alert data
        type=$(echo "$POST_DATA" | sed -n 's/.*"type"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
        severity=$(echo "$POST_DATA" | sed -n 's/.*"severity"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
        message=$(echo "$POST_DATA" | sed -n 's/.*"message"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
        source=$(echo "$POST_DATA" | sed -n 's/.*"source"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
        details=$(echo "$POST_DATA" | sed -n 's/.*"details"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
        
        # Validate required fields
        if [ -z "$type" ] || [ -z "$severity" ] || [ -z "$message" ]; then
            echo "{\"status\": \"error\", \"message\": \"Missing required fields\"}"
            exit 1
        fi
        
        # Add alert
        new_alert=$(add_alert "$type" "$severity" "$message" "$source" "$details")
        
        # Return success
        echo "{\"status\": \"success\", \"message\": \"Alert added\", \"alert\": $new_alert}"
        exit 0
    elif [ "$action" = "resolve" ]; then
        # Parse alert ID
        alert_id=$(echo "$POST_DATA" | sed -n 's/.*"id"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
        
        # Validate required fields
        if [ -z "$alert_id" ]; then
            echo "{\"status\": \"error\", \"message\": \"Missing alert ID\"}"
            exit 1
        fi
        
        # Resolve alert
        resolve_alert "$alert_id"
        
        # Return success
        echo "{\"status\": \"success\", \"message\": \"Alert resolved\"}"
        exit 0
    else
        echo "{\"status\": \"error\", \"message\": \"Invalid action\"}"
        exit 1
    fi
fi

# Handle unknown request method
echo "$(date): Unknown method: $REQUEST_METHOD" >> $LOG_FILE
echo "{\"status\": \"error\", \"message\": \"Unsupported method: $REQUEST_METHOD\"}"
exit 1