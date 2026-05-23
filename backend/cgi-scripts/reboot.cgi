#!/bin/sh
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

if [ "$REQUEST_METHOD" = "POST" ]; then
  echo "{\"status\": \"success\", \"message\": \"Rebooting system...\"}"
  sync
  reboot
  exit 0
else
  echo "{\"status\": \"error\", \"message\": \"Unsupported method: $REQUEST_METHOD\"}"
  exit 1
fi