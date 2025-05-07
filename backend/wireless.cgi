
#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Wireless configuration file (example: /etc/config/wireless)
WIRELESS_CONFIG="/etc/config/wireless"

# Handle GET request to fetch wireless configuration
if [ "$REQUEST_METHOD" = "GET" ]; then
    if [ ! -f "$WIRELESS_CONFIG" ]; then
        echo "{\"status\": \"error\", \"message\": \"Wireless configuration not found\"}"
        exit 1
    fi

    # Extract wireless configuration
    SSID=$(uci get wireless.@wifi-iface[0].ssid 2>/dev/null || echo "")
    PASSWORD=$(uci get wireless.@wifi-iface[0].key 2>/dev/null || echo "")
    ENCRYPTION=$(uci get wireless.@wifi-iface[0].encryption 2>/dev/null || echo "None")
    CHANNEL=$(uci get wireless.radio0.channel 2>/dev/null || echo "Auto")
    ENABLED=$(uci get wireless.@wifi-iface[0].disabled 2>/dev/null || echo "1")

    # Convert enabled/disabled to boolean
    if [ "$ENABLED" = "1" ]; then
        ENABLED=false
    else
        ENABLED=true
    fi

    # Output JSON
    cat <<EOF
{
  "status": "success",
  "data": {
    "ssid": "$SSID",
    "password": "$PASSWORD",
    "encryption": "$ENCRYPTION",
    "channel": "$CHANNEL",
    "enabled": $ENABLED
  }
}
EOF
    exit 0
fi

# Handle POST request to update wireless configuration
if [ "$REQUEST_METHOD" = "POST" ]; then
    # Read input JSON
    read -r INPUT_JSON
    SSID=$(echo "$INPUT_JSON" | jq -r '.ssid')
    PASSWORD=$(echo "$INPUT_JSON" | jq -r '.password')
    ENCRYPTION=$(echo "$INPUT_JSON" | jq -r '.encryption')
    CHANNEL=$(echo "$INPUT_JSON" | jq -r '.channel')
    ENABLED=$(echo "$INPUT_JSON" | jq -r '.enabled')

    # Validate input
    if [ -z "$SSID" ] || [ ${#SSID} -gt 32 ]; then
        echo "{\"status\": \"error\", \"message\": \"Invalid SSID\"}"
        exit 1
    fi

    if [ "$ENCRYPTION" != "None" ] && ([ -z "$PASSWORD" ] || [ ${#PASSWORD} -lt 8 ] || [ ${#PASSWORD} -gt 63 ]); then
        echo "{\"status\": \"error\", \"message\": \"Invalid password\"}"
        exit 1
    fi

    # Update wireless configuration
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
    uci commit wireless
    wifi reload

    echo "{\"status\": \"success\", \"message\": \"Wireless configuration updated\"}"
    exit 0
fi

# Handle unsupported methods
echo "{\"status\": \"error\", \"message\": \"Unsupported request method: $REQUEST_METHOD\"}"
exit 1