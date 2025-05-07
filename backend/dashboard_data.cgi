#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve memory usage
memory_info=$(cat /proc/meminfo)

# Retrieve bandwidth usage - improved version
tx_rate=""
rx_rate=""
for i in $(seq 1 5); do
  INTERFACE="br-lan"  
  # Get initial bytes
  RX1=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes)
  TX1=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes)
  sleep 1
  # Get final bytes
  RX2=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes)
  TX2=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes)
  # Calculate rates in Mbps
  RX_RATE=$(echo "scale=2; ($RX2 - $RX1) * 8 / 1000000" | bc)
  TX_RATE=$(echo "scale=2; ($TX2 - $TX1) * 8 / 1000000" | bc)
  rx_rate=$RX_RATE
  tx_rate=$TX_RATE
done

# Retrieve active connections using netstat
active_connections_info=$(netstat -tulnp)

# Check if firewall is enabled (more reliable method)
firewall_enabled=0
if [ -x /etc/init.d/firewall ] && /etc/init.d/firewall enabled; then
  firewall_enabled=1
fi

# Get actual firewall rules using iptables
firewall_rules_info=$(iptables-save)

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

# Retrieve system status using top
top_info=$(top -bn1)

# Helper function to escape JSON strings
json_escape() {
  echo "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g'
}

# Count rules
active_rules=$(echo "$firewall_rules_info" | grep -c -- "-A")
total_rules=$(echo "$firewall_rules_info" | grep -c -- "-A\|:") 

# Output JSON
cat <<EOF
{
  "memoryInfo": "$(json_escape "$memory_info")",
  "bandwidthInfo": {
    "txRate": "$tx_rate",
    "rxRate": "$rx_rate"
  },
  "activeConnectionsInfo": "$(json_escape "$active_connections_info")",
  "connectedDevicesInfo": "$(json_escape "$formatted_devices")",
  "topInfo": "$(json_escape "$top_info")",
  "firewallStatus": {
    "status": $firewall_enabled,
    "rules": {
      "activeRules": $active_rules,
      "totalRules": $total_rules
    }
  }
}
EOF