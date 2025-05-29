#!/bin/sh

# CGI headers with CORS
echo "Content-type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST"
echo "Access-Control-Allow-Headers: Content-Type"
echo ""

# Log file for history and debug
HISTORY_FILE="/tmp/performance_history.json"
LOG_FILE="/tmp/performance_cgi.log"
TARGET_IP_FILE="/tmp/performance_target_ip"

# Default ping target and interface
FALLBACK_TARGET="10.0.2.2" # Gateway, pingable
INTERFACE="eth0" # Confirmed from ip addr

# Function to log messages
log() {
  echo "[$(date)]: $1" >> $LOG_FILE
}

# Function to get target IP
get_target_ip() {
  local target_ip=$(cat $TARGET_IP_FILE 2>/dev/null)
  [ -z "$target_ip" ] && target_ip=$FALLBACK_TARGET
  log "Selected target IP: $target_ip"
  echo $target_ip
}

# Function to set target IP
set_target_ip() {
  local target_ip=$1
  echo $target_ip > $TARGET_IP_FILE
  log "Set target IP: $target_ip"
}

# Function to get latency and packet loss
get_ping_metrics() {
  local target=$1
  local count=$2
  log "Running ping -c $count $target"
  local ping_result=$(ping -c $count $target 2>&1)
  local ping_status=$?
  log "Raw ping output: $ping_result"
  if [ $ping_status -ne 0 ]; then
    log "Ping failed: status=$ping_status"
    echo "{\"latency\": 0, \"packetLoss\": 100}"
    return
  fi
  local latency=$(echo "$ping_result" | grep "min/avg/max" | grep -o "[0-9.]\+/[0-9.]\+/[0-9.]\+" | cut -d'/' -f2 | awk '{printf "%.1f", $1}')
  local packet_loss=$(echo "$ping_result" | grep "packet loss" | grep -o "[0-9.]\+%" | tr -d '%' | awk '{printf "%.1f", $1}')
  [ -z "$latency" ] && latency=0
  [ -z "$packet_loss" ] && packet_loss=100
  log "Ping result: latency=$latency, packet_loss=$packet_loss"
  echo "{\"latency\": $latency, \"packetLoss\": $packet_loss}"
}

# Function to get throughput (Mbps)
get_throughput() {
  local interface=$INTERFACE
  log "Reading /proc/net/dev for $interface"
  local stats_before=$(cat /proc/net/dev | grep "$interface" | awk '{print $2, $10}')
  if [ -z "$stats_before" ]; then
    log "Interface $interface not found"
    echo 0
    return
  fi
  local rx_bytes_before=$(echo $stats_before | awk '{print $1}')
  local tx_bytes_before=$(echo $stats_before | awk '{print $2}')
  log "Before: rx_bytes=$rx_bytes_before, tx_bytes=$tx_bytes_before"
  sleep 3 # 3 seconds to capture traffic
  local stats_after=$(cat /proc/net/dev | grep "$interface" | awk '{print $2, $10}')
  local rx_bytes_after=$(echo $stats_after | awk '{print $1}')
  local tx_bytes_after=$(echo $stats_after | awk '{print $2}')
  log "After: rx_bytes=$rx_bytes_after, tx_bytes=$tx_bytes_after"
  local rx_mbps=$(( (rx_bytes_after - rx_bytes_before) * 8 / 3000000 )) # Adjusted for 3 seconds
  local tx_mbps=$(( (tx_bytes_after - tx_bytes_before) * 8 / 3000000 ))
  local throughput=$(( (rx_mbps + tx_mbps) / 2 ))
  [ $throughput -lt 0 ] && throughput=0
  # Simple moving average (store last throughput in /tmp)
  local last_throughput=$(cat /tmp/last_throughput 2>/dev/null || echo 0)
  local avg_throughput=$(( (throughput + last_throughput) / 2 ))
  echo $avg_throughput > /tmp/last_throughput
  log "Throughput: rx_mbps=$rx_mbps, tx_mbps=$tx_mbps, avg=$avg_throughput"
  echo $avg_throughput
}

# Function to manage history
update_history() {
  local latency=$1
  local packet_loss=$2
  local throughput=$3
  local time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local entry="{\"time\": \"$time\", \"latency\": $latency, \"packetLoss\": $packet_loss, \"throughput\": $throughput}"
  local history=$(cat $HISTORY_FILE 2>/dev/null || echo "[]")
  local new_history=$(echo "[$entry$(echo $history | jsonfilter -e '@[0:5]' | sed 's/^\[//; s/\]$//')]" | sed 's/\]\[/,/')
  echo "$new_history" > $HISTORY_FILE
  log "History updated: $entry"
  echo "$new_history"
}

# Initialize history file if empty
[ ! -f $HISTORY_FILE ] && echo "[]" > $HISTORY_FILE

# Read POST data
if [ "$REQUEST_METHOD" = "POST" ]; then
  read -r POST_DATA
  log "POST request started"
  log "POST_DATA=$POST_DATA"
  action=$(echo "$POST_DATA" | jsonfilter -e '@.action')
  log "Action: $action"

  if [ "$action" = "test" ]; then
    target_ip=$(echo "$POST_DATA" | jsonfilter -e '@.targetIp')
    duration=$(echo "$POST_DATA" | jsonfilter -e '@.duration')
    [ -z "$target_ip" ] && target_ip=$(get_target_ip)
    [ -z "$duration" ] && duration=30
    log "Running test: target=$target_ip, duration=$duration"
    ping_metrics=$(get_ping_metrics $target_ip $((duration / 4)))
    ping_status=$?
    latency=$(echo $ping_metrics | jsonfilter -e '@.latency')
    packet_loss=$(echo $ping_metrics | jsonfilter -e '@.packetLoss')
    if [ $ping_status -ne 0 ]; then
      log "Test ping failed: status=$ping_status"
      echo "{\"status\": \"error\", \"message\": \"Ping failed\"}"
      exit 0
    fi
    log "Test completed: latency=$latency, packet_loss=$packet_loss"
    set_target_ip $target_ip # Store user-input target IP
    echo "{\"status\": \"success\", \"message\": \"Network test completed\"}"
  elif [ "$action" = "update" ]; then
    qos_enabled=$(echo "$POST_DATA" | jsonfilter -e '@.qosEnabled')
    uci set sqm.@queue[0].enabled="$([ "$qos_enabled" = "true" ] && echo 1 || echo 0)"
    uci commit sqm
    /etc/init.d/sqm restart >/dev/null 2>&1
    log "SQM updated: enabled=$qos_enabled"
    echo "{\"status\": \"success\", \"message\": \"SQM updated\"}"
  else
    log "Invalid action: $action"
    echo "{\"status\": \"error\", \"message\": \"Invalid action\"}"
  fi
  exit 0
fi

# Handle GET request
log "GET request started"
target_ip=$(get_target_ip)
ping_metrics=$(get_ping_metrics $target_ip 4)
latency=$(echo $ping_metrics | jsonfilter -e '@.latency')
packet_loss=$(echo $ping_metrics | jsonfilter -e '@.packetLoss')
throughput=$(get_throughput)
qos_enabled=$(uci get sqm.@queue[0].enabled 2>/dev/null || echo 0)
history=$(update_history $latency $packet_loss $throughput)

# Output JSON
cat <<EOF
{
  "metrics": {
    "latency": $latency,
    "packetLoss": $packet_loss,
    "throughput": $throughput
  },
  "history": $history,
  "qos": { "enabled": $([ "$qos_enabled" = "1" ] && echo true || echo false) }
}
EOF
log "GET response sent"