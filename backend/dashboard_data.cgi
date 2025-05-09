#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve memory usage
memory_info=$(cat /proc/meminfo 2>/dev/null || echo "N/A")

# Retrieve bandwidth usage
tx_rate=""
rx_rate=""
INTERFACE="eth0"
RX1=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes 2>/dev/null || echo "0")
TX1=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes 2>/dev/null || echo "0")
sleep 1
RX2=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes 2>/dev/null || echo "0")
TX2=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes 2>/dev/null || echo "0")
RX_RATE=$(( ($RX2 - $RX1) * 8 / 1000000 ))
TX_RATE=$(( ($TX2 - $TX1) * 8 / 1000000 ))
rx_rate=$RX_RATE
tx_rate=$TX_RATE

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

# Properly parse network interfaces with awk
network_info_json=$(ifconfig 2>/dev/null | awk '
BEGIN {
  print "["
  first_interface = 1
}

# Start of a new interface block
/^[a-zA-Z0-9]/ {
  # Close previous interface block if not the first one
  if (!first_interface) {
    print "  },"
  } else {
    first_interface = 0
  }
  
  # Start new interface block
  interface = $1
  gsub(/:$/, "", interface)  # Remove trailing colon if present
  printf "  {\n"
  printf "    \"interface\": \"%s\"", interface
  
  # Look for HWaddr in the first line
  for (i=1; i<=NF; i++) {
    if ($i == "HWaddr" && i+1 <= NF) {
      printf ",\n    \"hwaddr\": \"%s\"", $(i+1)
    }
  }
}

# Parse inet addr, Bcast, Mask
/inet addr:/ {
  match($0, /inet addr:([^ ]+)/, inet)
  match($0, /Bcast:([^ ]+)/, bcast)
  match($0, /Mask:([^ ]+)/, mask)
  
  if (inet[1] != "") printf ",\n    \"inet\": \"%s\"", inet[1]
  if (bcast[1] != "") printf ",\n    \"bcast\": \"%s\"", bcast[1]
  if (mask[1] != "") printf ",\n    \"mask\": \"%s\"", mask[1]
}

# Parse inet6 addr
/inet6 addr:/ {
  match($0, /inet6 addr:([^ ]+)/, inet6)
  if (inet6[1] != "") printf ",\n    \"inet6\": \"%s\"", inet6[1]
}

# Parse MTU
/MTU:/ {
  match($0, /MTU:([0-9]+)/, mtu)
  if (mtu[1] != "") printf ",\n    \"mtu\": \"%s\"", mtu[1]
}

# Parse RX/TX statistics
/RX packets:/ {
  match($0, /RX packets:([0-9]+)/, rx_packets)
  match($0, /TX packets:([0-9]+)/, tx_packets)
  if (rx_packets[1] != "") printf ",\n    \"rx_packets\": \"%s\"", rx_packets[1]
  if (tx_packets[1] != "") printf ",\n    \"tx_packets\": \"%s\"", tx_packets[1]
}

/RX bytes:/ {
  match($0, /RX bytes:([0-9]+)/, rx_bytes)
  match($0, /TX bytes:([0-9]+)/, tx_bytes)
  if (rx_bytes[1] != "") printf ",\n    \"rx_bytes\": \"%s\"", rx_bytes[1]
  if (tx_bytes[1] != "") printf ",\n    \"tx_bytes\": \"%s\"", tx_bytes[1]
}

END {
  # Close the last interface block and the JSON array
  if (!first_interface) {
    print "\n  }"
  }
  print "]"
}
' 2>/dev/null || echo "[]")

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
  },
  "networkInfo": $network_info_json
}
EOF