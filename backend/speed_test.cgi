#!/bin/sh

echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Log file for debugging
LOG_FILE="/tmp/speed_test_cgi.log"

# Function to log messages
log() {
  echo "[$(date)]: $1" >> $LOG_FILE
}

log "Speed test request received"

# Handle OPTIONS request for CORS
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  log "Responding to OPTIONS request"
  echo "{\"status\": \"success\"}"
  exit 0
fi

# Function to run a speed test
run_speed_test() {
  log "Starting speed test"

  # Target IP for testing (default gateway or a reliable server)
  TARGET_IP=$(ip route | grep default | awk '{print $3}')
  [ -z "$TARGET_IP" ] && TARGET_IP="8.8.8.8"

  log "Using target IP: $TARGET_IP"

  # Test latency
  log "Testing latency"
  ping_result=$(ping -c 5 $TARGET_IP 2>&1)
  latency=$(echo "$ping_result" | grep "min/avg/max" | grep -o "[0-9.]\+/[0-9.]\+/[0-9.]\+" | cut -d'/' -f2)
  [ -z "$latency" ] && latency=0

  log "Latency: $latency ms"

  # Test download speed (using interface statistics)
  log "Testing download speed"
  rx_bytes_before=$(cat /sys/class/net/eth0/statistics/rx_bytes 2>/dev/null || echo 0)

  # Generate some traffic by downloading a file
  wget -O /dev/null http://speedtest.ftp.otenet.gr/files/test100k.db &>/dev/null &
  wget_pid=$!

  # Wait for 5 seconds
  sleep 5

  # Kill wget if it's still running
  kill $wget_pid &>/dev/null

  rx_bytes_after=$(cat /sys/class/net/eth0/statistics/rx_bytes 2>/dev/null || echo 0)
  # Ensure proper JSON number format with leading zero for decimals
  download_speed=$(echo "scale=2; (($rx_bytes_after - $rx_bytes_before) * 8) / (1000000 * 5)" | bc)
  [ -z "$download_speed" ] && download_speed=0
  # Ensure proper JSON number format
  download_speed=$(printf "%.2f" $download_speed)

  log "Download speed: $download_speed Mbps"

  # Test upload speed (simplified estimate based on download)
  upload_speed=$(echo "scale=2; $download_speed * 0.3" | bc)
  [ -z "$upload_speed" ] && upload_speed=0
  # Ensure proper JSON number format
  upload_speed=$(printf "%.2f" $upload_speed)

  log "Upload speed (estimated): $upload_speed Mbps"

  # Save results to performance history file
  HISTORY_FILE="/tmp/performance_history.json"
  time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Ensure latency has proper JSON number format
  latency=$(printf "%.2f" $latency)

  # Create a new entry
  new_entry="{\"time\": \"$time\", \"latency\": $latency, \"packetLoss\": 0, \"throughput\": $download_speed}"

  # Read existing history or create empty array
  history=$(cat $HISTORY_FILE 2>/dev/null || echo "[]")

  # Add new entry to the beginning of the array using a simpler approach
  # Extract first 9 entries or fewer if there aren't that many
  if [ "$history" = "[]" ]; then
    # If history is empty, just use the new entry
    new_history="[$new_entry]"
  else
    # Remove the opening and closing brackets
    history_content=$(echo "$history" | sed 's/^\[//;s/\]$//')
    # Add the new entry at the beginning and limit to 10 entries
    new_history="[$new_entry,$history_content]"
    # Limit to 10 entries by removing everything after the 10th entry's closing brace
    # This is a simplified approach that works if the JSON is well-formed
    entry_count=$(echo "$new_history" | grep -o "{" | wc -l)
    if [ "$entry_count" -gt 10 ]; then
      # Find the position of the 10th closing brace
      new_history=$(echo "$new_history" | awk '{
        count = 0;
        for(i=1; i<=length($0); i++) {
          char = substr($0, i, 1);
          if(char == "}") {
            count++;
            if(count == 10) {
              print substr($0, 1, i) "]";
              exit;
            }
          }
        }
        print $0;
      }')
    fi
  fi

  # Save updated history
  echo "$new_history" > $HISTORY_FILE

  log "Results saved to history file"

  # Return results
  echo "{\"status\": \"success\", \"download\": $download_speed, \"upload\": $upload_speed, \"latency\": $latency, \"time\": \"$time\"}"
}

# Run the speed test
run_speed_test
log "Speed test completed"
exit 0