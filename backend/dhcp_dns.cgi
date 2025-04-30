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

# Handle GET request to fetch DHCP & DNS configuration
if [ "$REQUEST_METHOD" = "GET" ]; then
    echo "$(date): GET request" >> $LOG_FILE

    # Fetch DHCP configuration
    DHCP_ENABLED=$(uci get dhcp.lan.ignore 2>/dev/null || echo "0") # Default to "0" (enabled)
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

    # Build JSON response
    JSON=$(cat <<EOF
{
  "dhcpEnabled": $([ "$DHCP_ENABLED" = "1" ] && echo "false" || echo "true"),
  "rangeStart": "$RANGE_START",
  "rangeEnd": "$RANGE_END",
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
    RANGE_START=$(echo "$POST_DATA" | sed -n 's/.*"rangeStart"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    RANGE_END=$(echo "$POST_DATA" | sed -n 's/.*"rangeEnd"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    LEASE_TIME=$(echo "$POST_DATA" | sed -n 's/.*"leaseTime"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    DHCPV6=$(echo "$POST_DATA" | sed -n 's/.*"dhcpv6"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    RA=$(echo "$POST_DATA" | sed -n 's/.*"ra"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    RA_SLAAC=$(echo "$POST_DATA" | sed -n 's/.*"raSlaac"[ ]*:[ ]*\(true\|false\).*/\1/p')
    RA_FLAGS=$(echo "$POST_DATA" | sed -n 's/.*"raFlags"[ ]*:[ ]*\[\(.*\)\].*/\1/p' | tr -d '"')
    PRIMARY_DNS=$(echo "$POST_DATA" | sed -n 's/.*"primaryDns"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    SECONDARY_DNS=$(echo "$POST_DATA" | sed -n 's/.*"secondaryDns"[ ]*:[ ]*"\([^"]*\)".*/\1/p')

    # Update DHCP configuration
    uci set dhcp.lan.ignore=$([ "$DHCP_ENABLED" = "false" ] && echo "1" || echo "0")
    [ -n "$RANGE_START" ] && uci set dhcp.lan.start="$RANGE_START"
    [ -n "$RANGE_END" ] && uci set dhcp.lan.limit="$RANGE_END"
    [ -n "$LEASE_TIME" ] && uci set dhcp.lan.leasetime="$LEASE_TIME"
    [ -n "$DHCPV6" ] && uci set dhcp.lan.dhcpv6="$DHCPV6"
    [ -n "$RA" ] && uci set dhcp.lan.ra="$RA"
    [ "$RA_SLAAC" = "true" ] && uci set dhcp.lan.ra_slaac="1" || uci set dhcp.lan.ra_slaac="0"
    [ -n "$RA_FLAGS" ] && uci set dhcp.lan.ra_flags="$RA_FLAGS"

    # Update DNS configuration
    DNS_LIST=""
    [ -n "$PRIMARY_DNS" ] && DNS_LIST="$PRIMARY_DNS"
    [ -n "$SECONDARY_DNS" ] && DNS_LIST="$DNS_LIST $SECONDARY_DNS"
    [ -n "$DNS_LIST" ] && uci set network.lan.dns="$DNS_LIST"

    # Commit changes and reload services
    uci commit dhcp
    uci commit network
    /etc/init.d/dnsmasq restart
    /etc/init.d/network reload

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