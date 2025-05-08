#!/bin/sh

# Debug log to trace execution
echo "$(date): REQUEST_METHOD=$REQUEST_METHOD" >> /tmp/network_cgi.log

# Send CORS headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: POST, GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "$(date): CORS preflight" >> /tmp/network_cgi.log
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Handle GET request to fetch eth0 data
if [ "$REQUEST_METHOD" = "GET" ]; then
    echo "$(date): GET request started" >> /tmp/network_cgi.log

    # Get eth0 data, suppress stderr
    IFCONFIG=$(ifconfig eth0 2>/dev/null)
    if [ -z "$IFCONFIG" ]; then
        echo "$(date): eth0 not found" >> /tmp/network_cgi.log
        echo "{\"status\": \"error\", \"message\": \"Interface eth0 not found\"}"
        exit 0
    fi

    echo "$(date): ifconfig output: $IFCONFIG" >> /tmp/network_cgi.log
    STATUS=$(echo "$IFCONFIG" | grep -q "UP" && echo "up" || echo "down")
    MAC=$(echo "$IFCONFIG" | grep -oE "HWaddr [0-9A-F:]{17}" | cut -d' ' -f2)
    IP=$(echo "$IFCONFIG" | grep -oE "inet addr:[0-9.]{7,15}" | cut -d':' -f2)
    NETMASK=$(echo "$IFCONFIG" | grep -oE "Mask:[0-9.]{7,15}" | cut -d':' -f2)
    GATEWAY=$(uci get network.lan.gateway 2>/dev/null || echo "")

    # Log parsed data
    echo "$(date): Parsed - STATUS=$STATUS, MAC=$MAC, IP=$IP, NETMASK=$NETMASK, GATEWAY=$GATEWAY" >> /tmp/network_cgi.log

    # Validate data
    [ -z "$MAC" ] && MAC="00:00:00:00:00:00"
    [ -z "$IP" ] && IP="0.0.0.0"
    [ -z "$NETMASK" ] && NETMASK="255.255.255.0"
    [ -z "$GATEWAY" ] && GATEWAY="0.0.0.0"

    # Output JSON
    JSON="{\"interfaces\": [{\"id\": \"eth0\", \"name\": \"eth0\", \"status\": \"$STATUS\", \"macAddress\": \"$MAC\", \"ipAddress\": \"$IP\", \"netmask\": \"$NETMASK\", \"gateway\": \"$GATEWAY\"}]}"
    echo "$JSON"
    echo "$(date): GET response sent: $JSON" >> /tmp/network_cgi.log
    exit 0
fi

# Handle POST request to update eth0
if [ "$REQUEST_METHOD" = "POST" ]; then
    echo "$(date): POST request started" >> /tmp/network_cgi.log
    read -t 1 -r POST_DATA
    echo "$(date): POST_DATA=$POST_DATA" >> /tmp/network_cgi.log

    INTERFACE=$(echo "$POST_DATA" | sed -n 's/.*"interface"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    IP=$(echo "$POST_DATA" | sed -n 's/.*"ip"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    GATEWAY=$(echo "$POST_DATA" | sed -n 's/.*"gateway"[ ]*:[ ]*"\([^"]*\)".*/\1/p')

    if [ -n "$INTERFACE" ] && [ -n "$IP" ]; then
        if [ "$INTERFACE" = "eth0" ]; then
            uci set network.lan.ipaddr="$IP" 2>/dev/null
            if [ -n "$GATEWAY" ]; then
                uci set network.lan.gateway="$GATEWAY" 2>/dev/null
            fi
            uci commit network 2>/dev/null
            /etc/init.d/network reload 2>/dev/null
            RESPONSE="{\"status\": \"success\", \"message\": \"Updated $INTERFACE to IP: $IP, Gateway: ${GATEWAY:-none}\"}"
            echo "$RESPONSE"
            echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
        else
            RESPONSE="{\"status\": \"error\", \"message\": \"Unsupported interface: $INTERFACE\"}"
            echo "$RESPONSE"
            echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
        fi
    else
        RESPONSE="{\"status\": \"error\", \"message\": \"Invalid or missing interface/IP\"}"
        echo "$RESPONSE"
        echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
    fi
    exit 0

    uci commit network 2>/dev/null
    /etc/init.d/network reload 2>/dev/null
    RESPONSE="{\"status\": \"success\", \"message\": \"Updated $INTERFACE to IP: $IP, Gateway: ${GATEWAY:-none}\"}"
fi

# Unknown method
echo "{\"status\": \"error\", \"message\": \"Unsupported method: $REQUEST_METHOD\"}"
echo "$(date): Unknown method: $REQUEST_METHOD" >> /tmp/network_cgi.log