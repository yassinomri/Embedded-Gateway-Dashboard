#!/bin/sh

# Send CORS headers with expanded allowed headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type, Pragma, Cache-Control"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Simple ping response
echo "{\"status\": \"success\", \"message\": \"Gateway is online\"}"
exit 0
