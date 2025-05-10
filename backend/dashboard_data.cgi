#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve memory usage
memory_info=$(cat /proc/meminfo 2>/dev/null || echo "N/A")

# Retrieve bandwidth usage for br-lan
BC="/usr/bin/bc"
tx_rate=""
rx_rate=""
INTERFACE="br-lan"
# Get initial RX/TX bytes
RX1=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes 2>/dev/null || echo "0")
TX1=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes 2>/dev/null || echo "0")
sleep 5  # Increase sleep interval to 5 seconds
# Get final RX/TX bytes
RX2=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes 2>/dev/null || echo "0")
TX2=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes 2>/dev/null || echo "0")
# Debugging
echo "DEBUG: RX1=$RX1, RX2=$RX2, TX1=$TX1, TX2=$TX2" >&2
# Calculate rates in Mbps using bc
RX_DIFF=$(echo "$RX2 - $RX1" | $BC)
TX_DIFF=$(echo "$TX2 - $TX1" | $BC)
RX_RATE=$(echo "scale=4; (($RX2 - $RX1) * 8) / (1000000 * 5)" | $BC)
TX_RATE=$(echo "scale=4; (($TX2 - $TX1) * 8) / (1000000 * 5)" | $BC)
rx_rate=$RX_RATE
tx_rate=$TX_RATE

# Retrieve active connections using netstat
active_connections_info=$(netstat -tulnp 2>/dev/null || echo "No active connections found")

# Determine if firewall is enabled
firewall_enabled=$(uci get firewall.@defaults[0].enabled 2>/dev/null || echo "0")
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

# Collect network info using a more robust approach combining ip and ifconfig
collect_network_info() {
  # Initialize an empty array for storing interface info
  echo "["
  
  # Get list of interfaces (excluding loopback if desired)
  interfaces=$(ip -o link show | awk -F': ' '{print $2}' | sort)
  first=true
  
  # Process each interface
  for iface in $interfaces; do
    if [ "$first" = true ]; then
      first=false
    else
      echo ","
    fi
    
    echo "  {"
    echo "    \"interface\": \"$iface\""
    
    # MAC address
    mac=$(ip -o link show dev "$iface" 2>/dev/null | awk '{print $17}')
    if [ -n "$mac" ] && [ "$mac" != "00:00:00:00:00:00" ]; then
      echo "    ,\"hwaddr\": \"$mac\""
    fi
    
    # IPv4 address, netmask and broadcast
    ipv4_info=$(ip -o -4 addr show dev "$iface" 2>/dev/null | head -n 1)
    if [ -n "$ipv4_info" ]; then
      ipv4_addr=$(echo "$ipv4_info" | awk '{print $4}' | cut -d/ -f1)
      ipv4_cidr=$(echo "$ipv4_info" | awk '{print $4}' | cut -d/ -f2)
      echo "    ,\"inet\": \"$ipv4_addr\""
      echo "    ,\"cidr\": \"$ipv4_cidr\""
      
      # Try to get broadcast address
      bcast=$(ip -o -4 addr show dev "$iface" 2>/dev/null | grep -o 'brd [^ ]*' | awk '{print $2}')
      if [ -n "$bcast" ]; then
        echo "    ,\"bcast\": \"$bcast\""
      fi
    fi
    
    # IPv6 address
    ipv6_addr=$(ip -o -6 addr show dev "$iface" 2>/dev/null | head -n 1 | awk '{print $4}' | cut -d/ -f1)
    if [ -n "$ipv6_addr" ]; then
      echo "    ,\"inet6\": \"$ipv6_addr\""
    fi
    
    # MTU
    mtu=$(ip -o link show dev "$iface" 2>/dev/null | awk '{print $5}')
    if [ -n "$mtu" ]; then
      echo "    ,\"mtu\": \"$mtu\""
    fi
    
    # RX/TX statistics
    if [ -d "/sys/class/net/$iface/statistics" ]; then
      rx_bytes=$(cat "/sys/class/net/$iface/statistics/rx_bytes" 2>/dev/null || echo "0")
      tx_bytes=$(cat "/sys/class/net/$iface/statistics/tx_bytes" 2>/dev/null || echo "0")
      rx_packets=$(cat "/sys/class/net/$iface/statistics/rx_packets" 2>/dev/null || echo "0")
      tx_packets=$(cat "/sys/class/net/$iface/statistics/tx_packets" 2>/dev/null || echo "0")
      
      echo "    ,\"rx_bytes\": \"$rx_bytes\""
      echo "    ,\"tx_bytes\": \"$tx_bytes\""
      echo "    ,\"rx_packets\": \"$rx_packets\""
      echo "    ,\"tx_packets\": \"$tx_packets\""
    fi
    
    echo "  }"
  done
  
  echo "]"
}

# Get network info using the more robust approach
network_info_json=$(collect_network_info 2>/dev/null || echo "[]")

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
  "loadaverageInfo": "$(json_escape "$loadaverage_info")",
  "firewallStatus": {
    "status": $firewall_enabled,
    "rules": {
      "activeRules": $active_rules,
      "totalRules": $total_rules
    }
  },
  "networkInfo": $network_info_json
}
EOF