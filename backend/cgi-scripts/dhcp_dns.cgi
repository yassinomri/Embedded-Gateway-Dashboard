#!/bin/sh

# Debug log
LOG_FILE="/tmp/dhcp_dns_cgi.log"
echo "$(date): REQUEST_METHOD=$REQUEST_METHOD" >> $LOG_FILE

# Send CORS headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: POST, GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Function to calculate the subnet using ipcalc.sh
get_subnet() {
    local ip="$1"
    local netmask="$2"
    echo "$(date): get_subnet called with IP=$ip and NETMASK=$netmask" >> $LOG_FILE
    local subnet=$(ipcalc.sh "$ip" "$netmask" | grep 'NETWORK=' | awk -F= '{print $2}' | awk -F/ '{print $1}')
    echo "$(date): Calculated subnet in get_subnet: $subnet" >> $LOG_FILE
    echo "$subnet"
}  

# Handle GET request to fetch DHCP & DNS configuration
if [ "$REQUEST_METHOD" = "GET" ]; then
    echo "$(date): GET request" >> $LOG_FILE

    # Fetch LAN IP and netmask
    IP_ADDRESS=$(uci get network.lan.ipaddr 2>/dev/null || echo "192.168.1.1")
    NETMASK=$(uci get network.lan.netmask 2>/dev/null || echo "255.255.255.0")
    echo "$(date): IP_ADDRESS=$IP_ADDRESS, NETMASK=$NETMASK" >> $LOG_FILE

    # Calculate the subnet
    SUBNET=$(get_subnet "$IP_ADDRESS" "$NETMASK")
    if [ -z "$SUBNET" ]; then
        echo "$(date): Subnet calculation failed, falling back to default subnet" >> $LOG_FILE
        SUBNET="${IP_ADDRESS%.*}.0"
    fi
    echo "$(date): SUBNET=$SUBNET" >> $LOG_FILE

    # Fetch DHCP configuration
    DHCP_ENABLED=$(uci get dhcp.lan.dhcpv4 2>/dev/null || echo "server") # Default to "server" (enabled)
    RANGE_START=$(uci get dhcp.lan.start 2>/dev/null || echo "100") # Default to "100"
    RANGE_END=$(uci get dhcp.lan.limit 2>/dev/null || echo "150") # Default to "150"
    LEASE_TIME=$(uci get dhcp.lan.leasetime 2>/dev/null || echo "12h") # Default to "12h"
    DHCPV6=$(uci get dhcp.lan.dhcpv6 2>/dev/null || echo "server") # Default to "server"
    RA=$(uci get dhcp.lan.ra 2>/dev/null || echo "server") # Default to "server"
    RA_SLAAC=$(uci get dhcp.lan.ra_slaac 2>/dev/null || echo "0") # Default to "0" (disabled)
    RA_FLAGS=$(uci get dhcp.lan.ra_flags 2>/dev/null || echo "") # Default to an empty string

    # Fetch DNS configuration
    PRIMARY_DNS=$(uci get network.lan.dns 2>/dev/null | awk '{print $1}' || echo "")
    SECONDARY_DNS=$(uci get network.lan.dns 2>/dev/null | awk '{print $2}' || echo "")

    # Construct full IP addresses for rangeStart and rangeEnd
    RANGE_START_FULL="${SUBNET%.*}.$RANGE_START"
    ADJUSTED_RANGE_END=$((RANGE_START + RANGE_END - 1))
    RANGE_END_FULL="${SUBNET%.*}.$ADJUSTED_RANGE_END"

    # Build JSON response
    JSON=$(cat <<EOF
{
  "dhcpEnabled": $([ "$DHCP_ENABLED" = "server" ] && echo "true" || echo "false"),
  "rangeStart": "$RANGE_START_FULL",
  "rangeEnd": "$RANGE_END_FULL",
  "leaseTime": "$LEASE_TIME",
  "dhcpv6": "$DHCPV6",
  "ra": "$RA",
  "raSlaac": $([ "$RA_SLAAC" = "1" ] && echo "true" || echo "false"),
  "raFlags": [$(echo "$RA_FLAGS" | sed 's/ /", "/g' | sed 's/^/"/;s/$/"/')],
  "primaryDns": "$PRIMARY_DNS",
  "secondaryDns": "$SECONDARY_DNS"
}
EOF
)
    echo "$JSON"
    echo "$(date): GET response sent: $JSON" >> $LOG_FILE
    exit 0
fi

# Handle POST request to update DHCP & DNS configuration
if [ "$REQUEST_METHOD" = "POST" ]; then
    echo "$(date): POST request" >> $LOG_FILE

    # Read POST data
    read -t 1 -r POST_DATA
    echo "$(date): POST_DATA=$POST_DATA" >> $LOG_FILE

    # Parse JSON data
    DHCP_ENABLED=$(echo "$POST_DATA" | sed -n 's/.*"dhcpEnabled"[ ]*:[ ]*\(true\|false\).*/\1/p')
    RANGE_START=$(echo "$POST_DATA" | sed -n 's/.*"rangeStart"[ ]*:[ ]*"\([^"]*\)".*/\1/p' | awk -F. '{print $4}')
    RANGE_END=$(echo "$POST_DATA" | sed -n 's/.*"rangeEnd"[ ]*:[ ]*"\([^"]*\)".*/\1/p' | awk -F. '{print $4}')
    LEASE_TIME=$(echo "$POST_DATA" | sed -n 's/.*"leaseTime"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    DHCPV6=$(echo "$POST_DATA" | sed -n 's/.*"dhcpv6"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    RA=$(echo "$POST_DATA" | sed -n 's/.*"ra"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    RA_SLAAC=$(echo "$POST_DATA" | sed -n 's/.*"raSlaac"[ ]*:[ ]*\(true\|false\).*/\1/p')
    PRIMARY_DNS=$(echo "$POST_DATA" | sed -n 's/.*"primaryDns"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    SECONDARY_DNS=$(echo "$POST_DATA" | sed -n 's/.*"secondaryDns"[ ]*:[ ]*"\([^"]*\)".*/\1/p')


    # Validate IP range
    if [ -z "$RANGE_START" ] || [ -z "$RANGE_END" ] || [ "$RANGE_START" -lt 0 ] || [ "$RANGE_START" -gt 255 ] || [ "$RANGE_END" -lt 0 ] || [ "$RANGE_END" -gt 255 ]; then
        echo "{\"status\": \"error\", \"message\": \"Invalid IP range\"}"
        echo "$(date): Invalid IP range: RANGE_START=$RANGE_START, RANGE_END=$RANGE_END" >> $LOG_FILE
        exit 1
    fi

    # Calculate the limit
    LIMIT=$((RANGE_END - RANGE_START + 1))
    if [ "$LIMIT" -le 0 ]; then
        echo "{\"status\": \"error\", \"message\": \"Invalid range: end range must be greater than or equal to start range\"}"
        echo "$(date): Invalid range: RANGE_START=$RANGE_START, RANGE_END=$RANGE_END, LIMIT=$LIMIT" >> $LOG_FILE
        exit 1
    fi

    # Update DHCP configuration
    [ "$DHCP_ENABLED" = "true" ] && uci set dhcp.lan.dhcpv4="server" || uci set dhcp.lan.dhcpv4="disabled"
    uci set dhcp.lan.start="$RANGE_START" || { echo "Failed to set dhcp.lan.start"; exit 1; }
    uci set dhcp.lan.limit="$LIMIT" || { echo "Failed to set dhcp.lan.limit"; exit 1; }
    [ -n "$LEASE_TIME" ] && uci set dhcp.lan.leasetime="$LEASE_TIME"
    [ -n "$DHCPV6" ] && uci set dhcp.lan.dhcpv6="$DHCPV6"
    [ -n "$RA" ] && uci set dhcp.lan.ra="$RA"
    [ "$RA_SLAAC" = "true" ] && uci set dhcp.lan.ra_slaac="1" || uci set dhcp.lan.ra_slaac="0"
    DNS_LIST=""
    [ -n "$PRIMARY_DNS" ] && DNS_LIST="$PRIMARY_DNS"
    [ -n "$SECONDARY_DNS" ] && DNS_LIST="$DNS_LIST $SECONDARY_DNS"
    [ -n "$DNS_LIST" ] && uci set network.lan.dns="$DNS_LIST"


    # Commit changes and reload services
    uci commit dhcp
    /etc/init.d/dnsmasq restart || { echo "Failed to restart dnsmasq"; exit 1; }

    uci commit network
    /etc/init.d/network reload || { echo "Failed to reload network"; exit 1; }

    # Send success response
    RESPONSE="{\"status\": \"success\", \"message\": \"DHCP & DNS configuration updated successfully\"}"
    echo "$RESPONSE"
    echo "$(date): POST response sent: $RESPONSE" >> $LOG_FILE
    exit 0
fi

# Handle unsupported methods
echo "{\"status\": \"error\", \"message\": \"Unsupported method: $REQUEST_METHOD\"}"
echo "$(date): Unsupported method: $REQUEST_METHOD" >> $LOG_FILE
exit 1