#!/bin/sh

# Add debug logging
LOG_FILE="/tmp/wireless_cgi.log"
echo "$(date): wireless.cgi started, REQUEST_METHOD=$REQUEST_METHOD, QUERY_STRING=$QUERY_STRING" >> $LOG_FILE

# Set default REQUEST_METHOD if not provided
if [ -z "$REQUEST_METHOD" ]; then
    # Check if QUERY_STRING contains option=get to assume GET
    if [ -n "$QUERY_STRING" ] && echo "$QUERY_STRING" | grep -q "option=get"; then
        REQUEST_METHOD="GET"
        echo "$(date): Setting REQUEST_METHOD to GET based on QUERY_STRING" >> $LOG_FILE
    else
        # Default to GET if we can't determine
        REQUEST_METHOD="GET"
        echo "$(date): Setting REQUEST_METHOD to default GET" >> $LOG_FILE
    fi
fi

echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "$(date): OPTIONS request" >> $LOG_FILE
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Wireless configuration file (example: /etc/config/wireless)
WIRELESS_CONFIG="/etc/config/wireless"

# Handle GET request to fetch wireless configuration
if [ "$REQUEST_METHOD" = "GET" ]; then
    echo "$(date): GET request" >> $LOG_FILE
    if [ ! -f "$WIRELESS_CONFIG" ]; then
        echo "$(date): Wireless config not found" >> $LOG_FILE
        echo "{\"status\": \"error\", \"message\": \"Wireless configuration not found\"}"
        exit 1
    fi

    # Extract wireless configuration
    SSID=$(uci get wireless.@wifi-iface[0].ssid 2>/dev/null || echo "")
    PASSWORD=$(uci get wireless.@wifi-iface[0].key 2>/dev/null || echo "")
    ENCRYPTION=$(uci get wireless.@wifi-iface[0].encryption 2>/dev/null || echo "None")
    CHANNEL=$(uci get wireless.radio0.channel 2>/dev/null || echo "Auto")
    DISABLED=$(uci get wireless.@wifi-iface[0].disabled 2>/dev/null || echo "0")
    BAND=$(uci get wireless.radio0.band 2>/dev/null || echo "2.4g")

    echo "$(date): Raw values: SSID=$SSID, ENCRYPTION=$ENCRYPTION, CHANNEL=$CHANNEL, DISABLED=$DISABLED, BAND=$BAND" >> $LOG_FILE

    # Convert disabled flag to enabled boolean (0=enabled, 1=disabled)
    if [ "$DISABLED" = "1" ]; then
        ENABLED=false
    else
        ENABLED=true
    fi

    echo "$(date): Converted DISABLED=$DISABLED to ENABLED=$ENABLED" >> $LOG_FILE

    # Output JSON
    RESPONSE="{
  \"status\": \"success\",
  \"data\": {
    \"ssid\": \"$SSID\",
    \"password\": \"$PASSWORD\",
    \"encryption\": \"$ENCRYPTION\",
    \"channel\": \"$CHANNEL\",
    \"enabled\": $ENABLED,
    \"band\": \"$BAND\"
  }
}"
    echo "$(date): Sending response: $RESPONSE" >> $LOG_FILE
    echo "$RESPONSE"
    exit 0
fi

# Handle POST request to update wireless configuration
if [ "$REQUEST_METHOD" = "POST" ]; then
    echo "$(date): POST request" >> $LOG_FILE
    # Read input JSON
    read -r INPUT_JSON
    echo "$(date): Received data: $INPUT_JSON" >> $LOG_FILE
    
    SSID=$(echo "$INPUT_JSON" | jq -r '.ssid')
    PASSWORD=$(echo "$INPUT_JSON" | jq -r '.password')
    ENCRYPTION=$(echo "$INPUT_JSON" | jq -r '.encryption')
    CHANNEL=$(echo "$INPUT_JSON" | jq -r '.channel')
    ENABLED=$(echo "$INPUT_JSON" | jq -r '.enabled')
    
    echo "$(date): Parsed values: SSID=$SSID, ENCRYPTION=$ENCRYPTION, CHANNEL=$CHANNEL, ENABLED=$ENABLED" >> $LOG_FILE

    # Validate input
    if [ -z "$SSID" ] || [ ${#SSID} -gt 32 ]; then
        echo "$(date): Invalid SSID" >> $LOG_FILE
        echo "{\"status\": \"error\", \"message\": \"Invalid SSID\"}"
        exit 1
    fi

    if [ "$ENCRYPTION" != "None" ] && ([ -z "$PASSWORD" ] || [ ${#PASSWORD} -lt 8 ] || [ ${#PASSWORD} -gt 63 ]); then
        echo "$(date): Invalid password" >> $LOG_FILE
        echo "{\"status\": \"error\", \"message\": \"Invalid password\"}"
        exit 1
    fi

    # Update wireless configuration
    echo "$(date): Updating wireless configuration" >> $LOG_FILE
    uci set wireless.@wifi-iface[0].ssid="$SSID"
    uci set wireless.@wifi-iface[0].encryption="$ENCRYPTION"
    if [ "$ENCRYPTION" != "None" ]; then
        uci set wireless.@wifi-iface[0].key="$PASSWORD"
    else
        uci delete wireless.@wifi-iface[0].key 2>/dev/null
    fi
    uci set wireless.radio0.channel="$CHANNEL"
    if [ "$ENABLED" = "true" ]; then
        uci delete wireless.@wifi-iface[0].disabled 2>/dev/null
    else
        uci set wireless.@wifi-iface[0].disabled="1"
    fi

    # Commit changes and reload wireless
    echo "$(date): Committing changes and reloading wireless" >> $LOG_FILE
    uci commit wireless
    wifi reload

    echo "$(date): Sending success response" >> $LOG_FILE
    echo "{\"status\": \"success\", \"message\": \"Wireless configuration updated\"}"
    exit 0
fi

# Handle unsupported methods
echo "$(date): Unsupported method: $REQUEST_METHOD" >> $LOG_FILE
echo "{\"status\": \"error\", \"message\": \"Unsupported request method: $REQUEST_METHOD\"}"
exit 1



