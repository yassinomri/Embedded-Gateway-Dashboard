#!/bin/sh

# Debug log
echo "$(date): REQUEST_METHOD=$REQUEST_METHOD" >> /tmp/dhcp_cgi.log

# Send CORS headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: POST, GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "$(date): CORS preflight" >> /tmp/dhcp_cgi.log
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Handle GET request to fetch eth0 data
if [ "$REQUEST_METHOD" = "GET" ]