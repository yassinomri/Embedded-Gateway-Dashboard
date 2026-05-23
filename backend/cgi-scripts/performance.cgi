#!/bin/sh

# CGI headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo ""

# Handle OPTIONS preflight
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  exit 0
fi

DATA_FILE="/tmp/performance.json"
TARGET_FILE="/tmp/perf_target_ip"

# Handle POST (set target IP)
if [ "$REQUEST_METHOD" = "POST" ]; then
  read -r POST_DATA

  # Extract targetIp from JSON (very simple parser)
  TARGET_IP=$(echo "$POST_DATA" | sed -n 's/.*"targetIp"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

  if [ -n "$TARGET_IP" ]; then
    echo "$TARGET_IP" > "$TARGET_FILE"
    echo "{\"status\":\"success\",\"message\":\"Target IP updated\"}"
  else
    echo "{\"status\":\"error\",\"message\":\"Missing targetIp\"}"
  fi
  exit 0
fi

# Handle GET
if [ -f "$DATA_FILE" ]; then
  cat "$DATA_FILE"
else
  # Fallback if daemon hasn't written yet
  cat <<EOF
{
  "metrics": { "latency": 0, "packetLoss": 100, "throughput": 0 },
  "history": [],
  "qos": { "enabled": false },
  "maxValues": { "latency": 0, "packetLoss": 100, "throughput": 0 },
  "averageValues": { "latency": 0, "packetLoss": 100, "throughput": 0 }
}
EOF
fi
