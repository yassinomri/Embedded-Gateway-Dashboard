#!/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: POST, GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Retrieve system information

# Get total uptime in seconds (cut -d. to ignore decimal part)
uptime_seconds=$(awk '{print int($1)}' /proc/uptime)
# Use arithmetic safely
days=$((uptime_seconds / 86400))
rem_after_days=$((uptime_seconds % 86400))
hours=$((rem_after_days / 3600))
rem_after_hours=$((rem_after_days % 3600))
minutes=$((rem_after_hours / 60))
# Format with leading zeros
[ "$days" -lt 10 ] && days="0$days"
[ "$hours" -lt 10 ] && hours="0$hours"
[ "$minutes" -lt 10 ] && minutes="0$minutes"
# Dynamic formatting
if [ "$days" -gt 0 ]; then
  uptime="${days}d: ${hours}h: ${minutes}m"
elif [ "$hours" -gt 0 ]; then
  uptime="${hours}h: ${minutes}m"
else
  uptime="${minutes}m"
fi



version=$(cat /proc/version | sed 's/ #.*$//')
date=$(date | awk '{print $1 " " $2 " " $3 " " $4 " " $6}')
hostname=$(grep "hostname" /etc/config/system | awk '{print $3}')
cpu_model=$(grep -m 1 '^Model' /proc/cpuinfo | cut -d ':' -f2 | xargs)
cpu_cores=$(grep -c "processor" /proc/cpuinfo)
memory_total=$(grep "MemTotal" /proc/meminfo | awk '{print $2}')
memory_free=$(grep "MemFree" /proc/meminfo | awk '{print $2}')
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
