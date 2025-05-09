#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve memory usage
memory_info=$(cat /proc/meminfo)

# Retrieve bandwidth usage
tx_rate=""
rx_rate=""
for i in $(seq 1 5); do
  INTERFACE="eth0"
  # Get initial bytes
  RX1=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes 2>/dev/null || echo "0")
  TX1=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes 2>/dev/null || echo "0")
  sleep 1
  # Get final bytes
  RX2=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes 2>/dev/null || echo "0")
  TX2=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes 2>/dev/null || echo "0")
  # Calculate rates in Mbps
  RX_RATE=$(echo "scale=2; ($RX2 - $RX1) * 8 / 1000000" | bc)
  TX_RATE=$(echo "scale=2; ($TX2 - $TX1) * 8 / 1000000" | bc)
  rx_rate=$RX_RATE
  tx_rate=$TX_RATE
done

# Retrieve active connections using netstat
active_connections_info=$(netstat -tulnp 2>/dev/null || echo "No active connections found")

# Determine if firewall is enabled
firewall_enabled=$(uci get firewall.enabled 2>/dev/null || echo "0")
if [ "$firewall_enabled" -eq 1 ]; then
  firewall_enabled="true"
else
  firewall_enabled="false"
fi

# Count total rules
total_rules=$(uci show firewall | grep -c '=rule' 2>/dev/null || echo "0")

# Count active rules (enabled rules)
active_rules=$(uci show firewall | grep "^firewall.@rule\[[0-9]\+\]=" | while read line; do
  index=$(echo "$line" | sed -n "s/^firewall.@rule\[\([0-9]\+\)\].*/\1/p")
  enabled=$(uci get firewall.@rule[$index].enabled 2>/dev/null)
  if [ -z "$enabled" ] || [ "$enabled" = "1" ] || [ "$enabled" = "true" ]; then
    echo $index
  fi
done | wc -l 2>/dev/null || echo "0")

# Retrieve connected devices (example: DHCP leases)
connected_devices_info=$(cat /tmp/dhcp.leases 2>/dev/null || echo "No DHCP leases found")

# Format connected devices to be more readable
formatted_devices=""
while read -r line; do
  if [ -n "$line" ]; then
    timestamp=$(echo "$line" | awk '{print $1}')
    mac=$(echo "$line" | awk '{print $2}')
    ip=$(echo "$line" | awk '{print $3}')
    hostname=$(echo "$line" | awk '{print $4}')
    formatted_devices="${formatted_devices}${timestamp} ${mac} ${ip} ${hostname}\n"
  fi
done <<EOF
$connected_devices_info
EOF

# Retrieve loadaverage 
loadaverage_info=$(cat /proc/loadavg 2>/dev/null || echo "N/A")

# Helper function to escape JSON strings
json_escape() {
  echo "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g'
}

# Output JSON
cat <<EOF
{
  "memoryInfo": "$(json_escape "$memory_info")",
  "bandwidthInfo": {
    "txRate": "$(json_escape "$tx_rate")",
    "rxRate": "$(json_escape "$rx_rate")"
  },
  "activeConnectionsInfo": "$(json_escape "$active_connections_info")",
  "connectedDevicesInfo": "$(json_escape "$formatted_devices")",
  "loadaverageInfo": "$(json_escape "$loadaverage_info")",
  "firewallStatus": {
    "status": $firewall_enabled,
    "rules": {
      "activeRules": $active_rules,
      "totalRules": $total_rules
    }
  }
}
EOF