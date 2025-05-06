#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve memory usage
memory_info=$(cat /proc/meminfo)

# Retrieve bandwidth usage using iftop (requires iftop to be installed)
bandwidth_info=$(iftop -t -s 1 -n -N 2>/dev/null)

# Retrieve active connections using netstat
active_connections_info=$(netstat -tulnp)

# Retrieve firewall rules overview using iptables
firewall_rules_info=$(iptables -L -v -n)

# Retrieve connected devices (example: DHCP leases)
connected_devices_info=$(cat /tmp/dhcp.leases 2>/dev/null || echo "No DHCP leases found")

# Retrieve system status using top
top_info=$(top -bn1)

# Output JSON
cat <<EOF
{
  "memoryInfo": "$(echo "$memory_info" | sed ':a;N;$!ba;s/\n/\\n/g')",
  "bandwidthInfo": "$(echo "$bandwidth_info" | sed ':a;N;$!ba;s/\n/\\n/g')",
  "activeConnectionsInfo": "$(echo "$active_connections_info" | sed ':a;N;$!ba;s/\n/\\n/g')",
  "firewallRulesInfo": "$(echo "$firewall_rules_info" | sed ':a;N;$!ba;s/\n/\\n/g')",
  "connectedDevicesInfo": "$(echo "$connected_devices_info" | sed ':a;N;$!ba;s/\n/\\n/g')",
  "topInfo": "$(echo "$top_info" | sed ':a;N;$!ba;s/\n/\\n/g')"
}
EOF