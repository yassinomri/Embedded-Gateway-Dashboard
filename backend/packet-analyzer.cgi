#!/bin/sh

# CGI headers with CORS
echo "Content-type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST"
echo "Access-Control-Allow-Headers: Content-Type"
echo ""

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

# Begin JSON array
echo "["

# Packet counter
count=0

# Create temporary files for analysis
TEMP_PCAP="/tmp/packet_capture.pcap"
TEMP_ANALYSIS="/tmp/packet_analysis.txt"

# Capture packets to a file for more detailed analysis
tcpdump -i "$INTERFACE" -c "$PACKET_COUNT" -w "$TEMP_PCAP" "$FILTER" 2>/dev/null

# Analyze the captured packets with more detail
tcpdump -r "$TEMP_PCAP" -nn -tt -v 2>/dev/null > "$TEMP_ANALYSIS"

# Process each packet with enhanced analysis
cat "$TEMP_ANALYSIS" | while read -r line; do
    # Skip empty lines
    [ -z "$line" ] && continue
    
    # Extract basic fields using shell tools
    time=$(echo "$line" | awk '{print $1}')
    
    # Skip lines that don't start with a timestamp
    echo "$time" | grep -q "^[0-9]" || continue
    
    src=$(echo "$line" | awk '{print $3}' | sed 's/://g')
    dst=$(echo "$line" | awk '{print $5}' | sed 's/://g')
    proto=$(echo "$line" | grep -o -E '\b(tcp|udp|icmp|arp|ip|ipv6)\b' | head -n1)
    length=$(echo "$line" | grep -o -E 'length [0-9]+' | awk '{print $2}')
    flags=$(echo "$line" | grep -o '\[.*\]' | head -n1)
    
    # Enhanced protocol detection
    if [ -z "$proto" ]; then
        if echo "$line" | grep -q "ICMP"; then
            proto="icmp"
        elif echo "$line" | grep -q "ARP"; then
            proto="arp"
        elif echo "$line" | grep -q "IP6"; then
            proto="ipv6"
        elif echo "$line" | grep -q "IP"; then
            proto="ip"
        fi
    fi
    
    # Extract ports for TCP/UDP
    src_port=""
    dst_port=""
    if [ "$proto" = "tcp" ] || [ "$proto" = "udp" ]; then
        src_port=$(echo "$src" | grep -o "\..*" | sed 's/\.//')
        dst_port=$(echo "$dst" | grep -o "\..*" | sed 's/\.//')
        src=$(echo "$src" | sed 's/\..*//')
        dst=$(echo "$dst" | sed 's/\..*//')
    fi
    
    # Enhanced packet type classification
    if [ "$proto" = "tcp" ]; then
        if [ "$dst_port" = "80" ] || [ "$dst_port" = "443" ]; then
            type="Web"
        elif [ "$dst_port" = "22" ]; then
            type="SSH"
        elif [ "$dst_port" = "25" ] || [ "$dst_port" = "587" ] || [ "$dst_port" = "465" ]; then
            type="Email"
        elif [ "$dst_port" = "53" ]; then
            type="DNS"
        else
            type="TCP Data"
        fi
    elif [ "$proto" = "udp" ]; then
        if [ "$dst_port" = "53" ]; then
            type="DNS"
        elif [ "$dst_port" = "67" ] || [ "$dst_port" = "68" ]; then
            type="DHCP"
        elif [ "$dst_port" = "123" ]; then
            type="NTP"
        else
            type="UDP Data"
        fi
    elif [ "$proto" = "icmp" ]; then
        icmp_type=$(echo "$line" | grep -o "ICMP.*" | cut -d' ' -f2)
        if [ "$icmp_type" = "echo" ]; then
            type="Ping"
        else
            type="ICMP Control"
        fi
    elif [ "$proto" = "arp" ]; then
        type="Address Resolution"
    else
        type="Unknown"
    fi
    
    # Extract TTL value
    ttl=$(echo "$line" | grep -o "ttl [0-9]*" | awk '{print $2}')
    
    # Determine direction (inbound/outbound)
    local_networks="192.168.0.0/16 10.0.0.0/8 172.16.0.0/12"
    direction="unknown"
    for network in $local_networks; do
        if echo "$src" | grep -q "^$(echo $network | cut -d'/' -f1 | sed 's/\.[0-9]*$//')\."; then
            if ! echo "$dst" | grep -q "^$(echo $network | cut -d'/' -f1 | sed 's/\.[0-9]*$//')\."; then
                direction="outbound"
                break
            fi
        elif echo "$dst" | grep -q "^$(echo $network | cut -d'/' -f1 | sed 's/\.[0-9]*$//')\."; then
            direction="inbound"
            break
        fi
    done
    
    # Generate enhanced info field
    if [ -n "$src_port" ] && [ -n "$dst_port" ]; then
        info="$proto $type from $src:$src_port to $dst:$dst_port"
    else
        info="$proto $type from $src to $dst"
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
done

# Clean up temporary files
rm -f "$TEMP_PCAP" "$TEMP_ANALYSIS"

# End JSON array
echo "]"




