#!/bin/sh

# CGI headers with CORS - expanded to allow more headers
echo "Content-type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type, Accept, Cache-Control, Pragma, X-Requested-With"
echo ""

# Handle OPTIONS preflight request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  # Just return headers for preflight
  exit 0
fi

# Parse query parameters
QUERY_STRING="${QUERY_STRING:-}"
PACKET_COUNT=10
INTERFACE="eth0"
FILTER=""

# Extract parameters from query string
if [ -n "$QUERY_STRING" ]; then
  for param in $(echo "$QUERY_STRING" | tr '&' ' '); do
    key=$(echo "$param" | cut -d= -f1)
    value=$(echo "$param" | cut -d= -f2)
    
    case "$key" in
      count) PACKET_COUNT="$value" ;;
      interface) INTERFACE="$value" ;;
      filter) FILTER="$value" ;;
    esac
  done
fi

# Validate packet count (max 50 for performance)
if [ "$PACKET_COUNT" -gt 50 ]; then
  PACKET_COUNT=50
fi

# Log request for debugging
echo "Request: count=$PACKET_COUNT interface=$INTERFACE filter=$FILTER" >> /tmp/packet-analyzer.log

# Begin JSON array
echo "["

# Packet counter
count=0

# Create temporary files for analysis
TEMP_PCAP="/tmp/packet_capture.pcap"
TEMP_ANALYSIS="/tmp/packet_analysis.txt"

# Capture packets to a file for more detailed analysis
tcpdump -i "$INTERFACE" -c "$PACKET_COUNT" -w "$TEMP_PCAP" "$FILTER" 2>/dev/null

# Check if capture was successful
if [ ! -s "$TEMP_PCAP" ]; then
  # Empty capture file, return empty array
  echo "]"
  exit 0
fi

# Analyze the captured packets with more detail
tcpdump -r "$TEMP_PCAP" -nn -tt -v 2>/dev/null > "$TEMP_ANALYSIS"

# Process each packet
while read -r line; do
    # Skip empty lines
    [ -z "$line" ] && continue
    
    # Extract packet details
    time=$(echo "$line" | grep -o "^[0-9.]*" | head -1)
    src=$(echo "$line" | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}(\.[0-9]+)?" | head -1)
    dst=$(echo "$line" | grep -o -E "([0-9]{1,3}\.){3}[0-9]{1,3}(\.[0-9]+)?" | head -2 | tail -1)
    proto=$(echo "$line" | grep -o -E "UDP|TCP|ICMP|ARP|IP" | head -1)
    length=$(echo "$line" | grep -o -E "length [0-9]+" | grep -o -E "[0-9]+" | head -1)
    
    # Extract more details based on protocol
    case "$proto" in
      TCP)
        src_port=$(echo "$line" | grep -o -E "$src\.[0-9]+" | grep -o -E "[0-9]+$" | head -1)
        dst_port=$(echo "$line" | grep -o -E "$dst\.[0-9]+" | grep -o -E "[0-9]+$" | head -1)
        flags=$(echo "$line" | grep -o -E "Flags \[[^\]]+\]" | head -1)
        ttl=$(echo "$line" | grep -o -E "ttl [0-9]+" | grep -o -E "[0-9]+" | head -1)
        type="TCP"
        ;;
      UDP)
        src_port=$(echo "$line" | grep -o -E "$src\.[0-9]+" | grep -o -E "[0-9]+$" | head -1)
        dst_port=$(echo "$line" | grep -o -E "$dst\.[0-9]+" | grep -o -E "[0-9]+$" | head -1)
        ttl=$(echo "$line" | grep -o -E "ttl [0-9]+" | grep -o -E "[0-9]+" | head -1)
        type="UDP"
        ;;
      ICMP)
        ttl=$(echo "$line" | grep -o -E "ttl [0-9]+" | grep -o -E "[0-9]+" | head -1)
        type="Ping"
        ;;
      *)
        type="$proto"
        ;;
    esac
    
    # Determine direction (inbound/outbound)
    if echo "$src" | grep -q -E "^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)" && 
       ! echo "$dst" | grep -q -E "^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)"; then
      direction="outbound"
    elif ! echo "$src" | grep -q -E "^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)" && 
         echo "$dst" | grep -q -E "^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)"; then
      direction="inbound"
    else
      direction="internal"
    fi
    
    # Create info field
    if [ "$proto" = "TCP" ] || [ "$proto" = "UDP" ]; then
      info="$proto $src_port > $dst_port"
    elif [ "$proto" = "ICMP" ]; then
      info="ICMP echo request/reply"
    else
      info="$proto packet"
    fi
    
    # Fallbacks
    [ -z "$time" ] && time="unknown"
    [ -z "$src" ] && src="unknown"
    [ -z "$dst" ] && dst="unknown"
    [ -z "$proto" ] && proto="unknown"
    [ -z "$length" ] && length=null || length=$length
    [ -z "$flags" ] && flags=""
    [ -z "$ttl" ] && ttl=null || ttl=$ttl
    [ -z "$src_port" ] && src_port=null || src_port=$src_port
    [ -z "$dst_port" ] && dst_port=null || dst_port=$dst_port

    # Add comma if not the first element
    [ "$count" -ne 0 ] && echo ","

    # Output enhanced JSON object
    cat <<EOF
{
  "time": "$time",
  "src": "$src",
  "src_port": $src_port,
  "dst": "$dst",
  "dst_port": $dst_port,
  "info": "$info",
  "protocol": "$proto",
  "length": $length,
  "type": "$type",
  "flags": "$flags",
  "ttl": $ttl,
  "direction": "$direction"
}
EOF

    count=$((count + 1))
done < "$TEMP_ANALYSIS"

# Clean up temporary files
rm -f "$TEMP_PCAP" "$TEMP_ANALYSIS"

# End JSON array
echo "]"






