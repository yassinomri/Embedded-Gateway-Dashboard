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

# Handle GET request to fetch interfaces with IP addresses
if [ "$REQUEST_METHOD" = "GET" ]; then
    echo "$(date): GET request started" >> /tmp/network_cgi.log
    
    # Get list of interfaces
    INTERFACES=$(ifconfig | grep -o "^[a-zA-Z0-9\-]\+" | sort)
    
    # Start JSON output
    echo -n "{\"interfaces\": ["
    
    FIRST=true
    for IFACE in $INTERFACES; do
        echo "$(date): Processing interface $IFACE" >> /tmp/network_cgi.log
        
        # Get interface data
        IFCONFIG=$(ifconfig $IFACE 2>/dev/null)
        if [ -z "$IFCONFIG" ]; then
            echo "$(date): $IFACE not found" >> /tmp/network_cgi.log
            continue
        fi
        
        # Check if interface has an IP address starting with 192
        IP=$(echo "$IFCONFIG" | grep -oE "inet addr:[0-9.]{7,15}" | cut -d':' -f2)
        if [ -z "$IP" ] || ! echo "$IP" | grep -q "^192"; then
            echo "$(date): $IFACE has no valid IP address (needs to start with 192), skipping" >> /tmp/network_cgi.log
            continue
        fi
        
        # Parse other interface data
        STATUS=$(echo "$IFCONFIG" | grep -q "UP" && echo "up" || echo "down")
        MAC=$(echo "$IFCONFIG" | grep -oE "HWaddr [0-9A-Fa-f:]{17}" | cut -d' ' -f2)
        NETMASK=$(echo "$IFCONFIG" | grep -oE "Mask:[0-9.]{7,15}" | cut -d':' -f2)
        
        # Use IP as gateway
        GATEWAY="$IP"
        
        # Validate data
        [ -z "$MAC" ] && MAC="00:00:00:00:00:00"
        [ -z "$NETMASK" ] && NETMASK="255.255.255.0"
        
        # Add comma if not first interface
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo -n ","
        fi
        
        # Output interface JSON
        echo -n "{\"id\": \"$IFACE\", \"name\": \"$IFACE\", \"status\": \"$STATUS\", \"macAddress\": \"$MAC\", \"netmask\": \"$NETMASK\", \"gateway\": \"$GATEWAY\"}"
        
        echo "$(date): Added $IFACE with gateway $GATEWAY to response" >> /tmp/network_cgi.log
    done
    
    # End JSON output
    echo "]}"
    echo "$(date): GET response sent" >> /tmp/network_cgi.log
    exit 0
fi

# Handle POST request to update interface
if [ "$REQUEST_METHOD" = "POST" ]; then
    echo "$(date): POST request started" >> /tmp/network_cgi.log
    read -t 1 -r POST_DATA
    echo "$(date): POST_DATA=$POST_DATA" >> /tmp/network_cgi.log

    INTERFACE=$(echo "$POST_DATA" | sed -n 's/.*"interface"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    GATEWAY=$(echo "$POST_DATA" | sed -n 's/.*"gateway"[ ]*:[ ]*"\([^"]*\)".*/\1/p')

    if [ -n "$INTERFACE" ]; then
        # Check if interface exists and has a valid IP
        IFCONFIG=$(ifconfig $INTERFACE 2>/dev/null)
        if [ -z "$IFCONFIG" ]; then
            RESPONSE="{\"status\": \"error\", \"message\": \"Interface $INTERFACE not found\"}"
            echo "$RESPONSE"
            echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
            exit 0
        fi
        
        # Check if interface has an IP address starting with 192
        IP=$(echo "$IFCONFIG" | grep -oE "inet addr:[0-9.]{7,15}" | cut -d':' -f2)
        if [ -z "$IP" ] || ! echo "$IP" | grep -q "^192"; then
            RESPONSE="{\"status\": \"error\", \"message\": \"Interface $INTERFACE has no valid IP address\"}"
            echo "$RESPONSE"
            echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
            exit 0
        fi
        
        # Set new IP address if gateway is provided
        if [ -n "$GATEWAY" ]; then
            # Validate gateway format (should start with 192)
            if ! echo "$GATEWAY" | grep -q "^192"; then
                RESPONSE="{\"status\": \"error\", \"message\": \"Invalid gateway format: $GATEWAY (must start with 192)\"}"
                echo "$RESPONSE"
                echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
                exit 0
            fi
            
            # Update IP address
            uci set network.lan.ipaddr="$GATEWAY" 2>/dev/null
            uci commit network 2>/dev/null
            /etc/init.d/network reload 2>/dev/null
            
            RESPONSE="{\"status\": \"success\", \"message\": \"Updated $INTERFACE IP address to: $GATEWAY\"}"
            echo "$RESPONSE"
            echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
            exit 0
        else
            RESPONSE="{\"status\": \"error\", \"message\": \"No gateway provided for update\"}"
            echo "$RESPONSE"
            echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
            exit 0
        fi
    else
        RESPONSE="{\"status\": \"error\", \"message\": \"Invalid or missing interface\"}"
        echo "$RESPONSE"
        echo "$(date): POST response sent: $RESPONSE" >> /tmp/network_cgi.log
        exit 0
    fi
fi

# Unknown method
echo "{\"status\": \"error\", \"message\": \"Unsupported method: $REQUEST_METHOD\"}"
echo "$(date): Unknown method: $REQUEST_METHOD" >> /tmp/network_cgi.log




