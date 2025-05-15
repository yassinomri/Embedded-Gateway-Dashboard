#!/bin/sh

# CGI headers with CORS
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
INTERFACE="br-lan"  # Default to br-lan which usually bridges all interfaces
FILTER=""

# Extract parameters from query string
if [ -n "$QUERY_STRING" ]; then
  for param in $(echo "$QUERY_STRING" | tr '&' ' '); do
    key=$(echo "$param" | cut -d= -f1)
    value=$(echo "$param" | cut -d= -f2)
    value=$(echo "$value" | sed 's/%20/ /g')  # Handle spaces in filter
    
    case "$key" in
      count) PACKET_COUNT="$value" ;;
      interface) INTERFACE="$value" ;;
      filter) FILTER="$value" ;;
    esac
  done
fi

# Validate packet count (max 100 for better capture)
if [ "$PACKET_COUNT" -gt 100 ]; then
  PACKET_COUNT=100
fi

# Log request for debugging
echo "Request: count=$PACKET_COUNT interface=$INTERFACE filter=$FILTER" >> /tmp/packet-analyzer.log

# Get available interfaces for debugging
AVAILABLE_INTERFACES=$(ip -o link show | awk -F': ' '{print $2}')
echo "Available interfaces: $AVAILABLE_INTERFACES" >> /tmp/packet-analyzer.log

# Begin JSON array
echo "["

# Packet counter
count=0

# Create temporary files for analysis
TEMP_PCAP="/tmp/packet_capture.pcap"
TEMP_ANALYSIS="/tmp/packet_analysis.txt"

# Capture packets to a file for more detailed analysis
# Use -v for more verbose output
tcpdump -i "$INTERFACE" -c "$PACKET_COUNT" -w "$TEMP_PCAP" "$FILTER" -v 2>>/tmp/packet-analyzer.log

# Check if capture was successful
if [ ! -s "$TEMP_PCAP" ]; then
  # Empty capture file, return empty array
  echo "]"
  echo "Empty capture file. Check interface name and permissions." >> /tmp/packet-analyzer.log
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
        icmp_type=$(echo "$line" | grep -o -E "ICMP echo (request|reply)" | head -1)
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
    
    # Create human-friendly info field
    if [ "$proto" = "TCP" ] || [ "$proto" = "UDP" ]; then
      # Try to identify common services by port
      service=""
      case "$dst_port" in
        80|8080) service="HTTP" ;;
        443) service="HTTPS" ;;
        53) service="DNS" ;;
        22) service="SSH" ;;
        21) service="FTP" ;;
        25) service="SMTP" ;;
        110) service="POP3" ;;
        143) service="IMAP" ;;
        3389) service="RDP" ;;
        5900) service="VNC" ;;
        *) service="" ;;
      esac
      
      if [ -n "$service" ]; then
        info="$service connection from $src:$src_port to $dst:$dst_port"
      else
        info="$proto connection from $src:$src_port to $dst:$dst_port"
      fi
    elif [ "$proto" = "ICMP" ]; then
      if [ -n "$icmp_type" ]; then
        info="$icmp_type from $src to $dst"
      else
        info="ICMP packet from $src to $dst"
      fi
    else
      info="$proto packet from $src to $dst"
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







