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

# Check if speedtest-cli is installed
if ! command -v speedtest-cli >/dev/null 2>&1; then
  log "speedtest-cli not found"
  echo "{\"status\": \"error\", \"message\": \"speedtest-cli not installed.\"}"
  exit 1
fi

# Function to run a speed test
run_speed_test() {
  log "Starting speed test"

  # Use speedtest-cli for accurate results
  speedtest_output=$(speedtest-cli --json 2>/dev/null)

  # Check if output is valid JSON (simple check)
  if ! echo "$speedtest_output" | grep -q '"download":'; then
    log "speedtest-cli did not return valid JSON"
    echo "{\"status\": \"error\", \"message\": \"speedtest-cli failed or returned invalid output.\"}"
    exit 1
  fi

  # Extract values using sed (more reliable for decimal numbers)
  download_speed=$(echo "$speedtest_output" | sed -n 's/.*"download":[[:space:]]*\([0-9.]*\).*/\1/p')
  upload_speed=$(echo "$speedtest_output" | sed -n 's/.*"upload":[[:space:]]*\([0-9.]*\).*/\1/p')
  latency=$(echo "$speedtest_output" | sed -n 's/.*"ping":[[:space:]]*\([0-9.]*\).*/\1/p')

  # Check for missing values
  if [ -z "$download_speed" ] || [ -z "$upload_speed" ] || [ -z "$latency" ]; then
    log "Speedtest failed or returned incomplete data"
    echo "{\"status\": \"error\", \"message\": \"Speedtest failed or returned incomplete data.\"}"
    exit 1
  fi

  # Convert bits per second to Mbps
  # Check if bc is available, otherwise use awk
  if command -v bc >/dev/null 2>&1; then
    download_mbps=$(echo "scale=2; $download_speed/1000000" | bc)
    upload_mbps=$(echo "scale=2; $upload_speed/1000000" | bc)
  else
    download_mbps=$(echo "$download_speed" | awk '{printf "%.2f", $1/1000000}')
    upload_mbps=$(echo "$upload_speed" | awk '{printf "%.2f", $1/1000000}')
  fi

  log "Download speed: $download_mbps Mbps"
  log "Upload speed: $upload_mbps Mbps"
  log "Latency: $latency ms"

  # Save results to performance history file
  HISTORY_FILE="/tmp/performance_history.json"
  time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Ensure latency has proper JSON number format
  latency_formatted=$(printf "%.2f" "$latency")

  # Create a new entry
  new_entry="{\"time\": \"$time\", \"latency\": $latency_formatted, \"packetLoss\": 0, \"throughput\": $download_mbps}"

  # Read existing history or create empty array
  if [ -f "$HISTORY_FILE" ]; then
    history=$(cat "$HISTORY_FILE" 2>/dev/null || echo "[]")
  else
    history="[]"
  fi

  # Add new entry to the beginning of the array
  if [ "$history" = "[]" ]; then
    # If history is empty, just use the new entry
    new_history="[$new_entry]"
  else
    # Remove the opening and closing brackets from existing history
    history_content=$(echo "$history" | sed 's/^\[//;s/\]$//')
    # Add the new entry at the beginning
    new_history="[$new_entry,$history_content]"
    
    # Limit to 10 entries by counting and truncating if needed
    entry_count=$(echo "$new_history" | grep -o '"time":' | wc -l)
    if [ "$entry_count" -gt 10 ]; then
      # Keep only first 10 entries - find the 10th closing brace
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
  echo "$new_history" > "$HISTORY_FILE"

  log "Results saved to history file"

  # Return results
  echo "{\"status\": \"success\", \"download\": $download_mbps, \"upload\": $upload_mbps, \"latency\": $latency_formatted, \"time\": \"$time\"}"
}

# Run the speed test
run_speed_test
log "Speed test completed"
exit 0