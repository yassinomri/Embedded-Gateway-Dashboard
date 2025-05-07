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

# Check if firewall is enabled
firewall_status=$(uci get firewall.enabled 2>/dev/null || echo "1")
if [ "$firewall_status" -eq 1 ]; then
  firewall_status="enabled"
else
  firewall_status="disabled"
fi

# Count the number of active firewall rules (example: from logs or configuration)
active_rules_count=$(grep -c '^config rule' /etc/config/firewall 2>/dev/null || echo 0)

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
  "connectedDevicesInfo": "$(echo "$connected_devices_info" | sed ':a;N;$!ba;s/\n/\\n/g')",
  "topInfo": "$(echo "$top_info" | sed ':a;N;$!ba;s/\n/\\n/g')",
  "firewallStatus": {
    "active": "$firewall_status",
    "rules": {
      "activeRules": "$(grep -c '^config rule' /etc/config/firewall 2>/dev/null || echo 0)",
      "totalRules": "$(grep -c '^config ' /etc/config/firewall 2>/dev/null || echo 0)"
    }
  }
}
EOF