#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve memory usage
memory_info=$(cat /proc/meminfo 2>/dev/null || echo "N/A")

# Retrieve RX/TX statistics for eth0 and phy0-ap0
BC="/usr/bin/bc"
eth0_tx_rate=""
eth0_rx_rate=""
wifi_tx_rate=""
wifi_rx_rate=""

# Calculate rates for eth0
if [ -d "/sys/class/net/eth0/statistics" ]; then
  # Get initial RX/TX bytes
  ETH0_RX1=$(cat /sys/class/net/eth0/statistics/rx_bytes 2>/dev/null || echo "0")
  ETH0_TX1=$(cat /sys/class/net/eth0/statistics/tx_bytes 2>/dev/null || echo "0")
  sleep 5
  # Get final RX/TX bytes
  ETH0_RX2=$(cat /sys/class/net/eth0/statistics/rx_bytes 2>/dev/null || echo "0")
  ETH0_TX2=$(cat /sys/class/net/eth0/statistics/tx_bytes 2>/dev/null || echo "0")
  # Calculate rates in Mbps
  ETH0_RX_RATE=$(echo "scale=4; (($ETH0_RX2 - $ETH0_RX1) * 8) / (1000000 * 2)" | $BC)
  ETH0_TX_RATE=$(echo "scale=4; (($ETH0_TX2 - $ETH0_TX1) * 8) / (1000000 * 2)" | $BC)
  eth0_rx_rate=$ETH0_RX_RATE
  eth0_tx_rate=$ETH0_TX_RATE
fi

# Calculate rates for phy0-ap0 (WiFi)
if [ -d "/sys/class/net/phy0-ap0/statistics" ]; then
  # Get initial RX/TX bytes
  WIFI_RX1=$(cat /sys/class/net/phy0-ap0/statistics/rx_bytes 2>/dev/null || echo "0")
  WIFI_TX1=$(cat /sys/class/net/phy0-ap0/statistics/tx_bytes 2>/dev/null || echo "0")
  sleep 5
  # Get final RX/TX bytes
  WIFI_RX2=$(cat /sys/class/net/phy0-ap0/statistics/rx_bytes 2>/dev/null || echo "0")
  WIFI_TX2=$(cat /sys/class/net/phy0-ap0/statistics/tx_bytes 2>/dev/null || echo "0")
  # Calculate rates in Mbps
  WIFI_RX_RATE=$(echo "scale=4; (($WIFI_RX2 - $WIFI_RX1) * 8) / (1000000 * 2)" | $BC)
  WIFI_TX_RATE=$(echo "scale=4; (($WIFI_TX2 - $WIFI_TX1) * 8) / (1000000 * 2)" | $BC)
  wifi_rx_rate=$WIFI_RX_RATE
  wifi_tx_rate=$WIFI_TX_RATE
fi

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

# Retrieve connected devices with connection type (WiFi/Ethernet)
collect_connected_devices_info() {
  # Get DHCP leases
  local dhcp_leases=$(cat /tmp/dhcp.leases 2>/dev/null || echo "")
  
  # Collect WiFi MACs for all wireless interfaces
  local wifi_macs=""
  
  # Get MAC addresses from the specific wireless interface phy0-ap0
  local wifi_stations=$(iw dev phy0-ap0 station dump 2>/dev/null || echo "")
  if [ -n "$wifi_stations" ]; then
    wifi_macs=$(echo "$wifi_stations" | grep Station | awk '{print $2}' | tr '[:upper:]' '[:lower:]')
  fi
  
  # Also try alternative command if the above didn't work
  if [ -z "$wifi_macs" ]; then
    wifi_macs=$(iwinfo phy0-ap0 assoclist 2>/dev/null | grep -o -E '([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}' | tr '[:upper:]' '[:lower:]')
  fi
  
  # Debug output
  echo "DEBUG: WiFi MACs found: $wifi_macs" >&2
  
  # Start JSON array
  echo "["
  
  # Flag to track if we need to add a comma
  local first=true
  
  # Process each line in dhcp leases
  while read -r line; do
    if [ -n "$line" ]; then
      timestamp=$(echo "$line" | awk '{print $1}')
      mac=$(echo "$line" | awk '{print $2}' | tr '[:upper:]' '[:lower:]')
      ip=$(echo "$line" | awk '{print $3}')
      hostname=$(echo "$line" | awk '{print $4}')
      
      # Initialize connection type as Ethernet by default
      connection_type="Ethernet"
      
      # Check if MAC is in the WiFi MACs list
      for wifi_mac in $wifi_macs; do
        if [ "$mac" = "$wifi_mac" ]; then
          connection_type="WiFi"
          break
        fi
      done
      
      # Add comma if not the first entry
      if [ "$first" = true ]; then
        first=false
      else
        echo ","
      fi
      
      # Output JSON object for this device
      echo "    {"
      echo "      \"ip\": \"$ip\","
      echo "      \"mac\": \"$mac\","
      echo "      \"hostname\": \"$hostname\","
      echo "      \"connectionType\": \"$connection_type\""
      echo "    }"
    fi
  done <<EOF
$dhcp_leases
EOF
  
  # Close JSON array
  echo "]"
}

# Get connected devices in JSON format
connected_devices_json=$(collect_connected_devices_info)

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
    "ethernet": {
      "txRate": "$eth0_tx_rate",
      "rxRate": "$eth0_rx_rate"
    },
    "wifi": {
      "txRate": "$wifi_tx_rate",
      "rxRate": "$wifi_rx_rate"
    }
  },
  "activeConnectionsInfo": "$(json_escape "$active_connections_info")",
  "connectedDevicesInfo": {
    "devices": $connected_devices_json
  },
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
