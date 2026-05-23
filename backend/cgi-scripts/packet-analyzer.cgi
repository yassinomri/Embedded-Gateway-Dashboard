#!/bin/sh

# CGI headers with CORS
echo "Content-type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type, Accept, Cache-Control, Pragma, X-Requested-With"
echo ""

# Handle OPTIONS preflight request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  exit 0
fi

OPTS_FILE="/tmp/packet_analyzer_opts"
DATA_FILE="/tmp/packet_analyzer.json"

# Parse query parameters (count/interface/filter)
QUERY_STRING="${QUERY_STRING:-}"
PACKET_COUNT=""
INTERFACE=""
FILTER=""

if [ -n "$QUERY_STRING" ]; then
  for param in $(echo "$QUERY_STRING" | tr '&' ' '); do
    key=$(echo "$param" | cut -d= -f1)
    value=$(echo "$param" | cut -d= -f2-)
    value=$(echo "$value" | sed 's/%20/ /g')

    case "$key" in
      count) PACKET_COUNT="$value" ;;
      interface) INTERFACE="$value" ;;
      filter) FILTER="$value" ;;
    esac
  done
fi

[ -z "$INTERFACE" ] && INTERFACE="any"

# Persist options for the daemon
{
  [ -n "$INTERFACE" ] && echo "interface=$INTERFACE"
  [ -n "$PACKET_COUNT" ] && echo "count=$PACKET_COUNT"
  [ -n "$FILTER" ] && echo "filter=$FILTER"
} > "$OPTS_FILE" 2>/dev/null

# Return cached data
if [ -f "$DATA_FILE" ]; then
  cat "$DATA_FILE"
else
  echo "[]"
fi
