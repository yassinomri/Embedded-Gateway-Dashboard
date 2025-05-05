#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: POST, GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve system information
uptime=$(uptime | awk '{print $3 " " $4}')
version=$(cat /proc/version)
date=$(date | awk '{print $1 " " $2 " " $3 " " $4 " " $6}')
hostname=$(grep "hostname" /etc/config/system | awk '{print $3}')
cpu_model=$(grep "model name" /proc/cpuinfo | head -n 1 | awk -F: '{print $2}' | xargs)
cpu_cores=$(grep -c "processor" /proc/cpuinfo)
memory_total=$(grep "MemTotal" /proc/meminfo | awk '{print $2 " KB"}')
memory_free=$(grep "MemFree" /proc/meminfo | awk '{print $2 " KB"}')
load_average=$(cat /proc/loadavg | awk '{print $1, $2, $3}')

# Output JSON
cat <<EOF
{
  "version": "$version",
  "uptime": "$uptime",
  "Date": "$date",
  "hostname": "$hostname",
  "cpuModel": "$cpu_model",
  "cpuCores": "$cpu_cores",
  "memoryTotal": "$memory_total",
  "memoryFree": "$memory_free",
  "loadAverage": "$load_average"
}
EOF