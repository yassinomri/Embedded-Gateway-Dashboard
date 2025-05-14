#!/bin/sh

# This script simulates failed WiFi authentication attempts
# It's for testing purposes only

# Log file
LOG_FILE="/var/log/messages"  # Changed from /var/log/syslog to /var/log/messages

# MAC address to use for simulation
MAC="aa:bb:cc:dd:ee:ff"

# Current timestamp
TIMESTAMP=$(date "+%b %d %H:%M:%S")

# Simulate 5 failed authentication attempts
for i in 1 2 3 4 5; do
  # Create a log entry similar to what hostapd would generate
  echo "$TIMESTAMP hostapd: wlan0: STA $MAC IEEE 802.11: authentication failed (incorrect password)" >> "$LOG_FILE"
  
  # Wait a second between attempts
  sleep 1
done

echo "Simulated 5 failed WiFi authentication attempts from MAC $MAC"
echo "Run the wifi_monitor.sh script to detect these attempts"
