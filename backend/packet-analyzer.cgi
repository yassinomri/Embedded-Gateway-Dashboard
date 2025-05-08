#!/bin/sh

# CGI headers
echo "Content-type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST"
echo "Access-Control-Allow-Headers: Content-Type"
echo ""

# Begin JSON array
echo "["

# Packet counter
count=0

# Capture and parse each packet
tcpdump -c 5 -nn -tt -q -v 2>/dev/null | while read -r line; do
    # Extract fields using shell tools
    time=$(echo "$line" | awk '{print $1}')
    src=$(echo "$line" | awk '{print $3}')
    dst=$(echo "$line" | awk '{print $5}')
    proto=$(echo "$line" | grep -o -E '\b(tcp|udp|icmp|arp)\b' | head -n1)
    length=$(echo "$line" | grep -o -E 'length [0-9]+' | awk '{print $2}')
    flags=$(echo "$line" | grep -o '\[.*\]' | head -n1)
    type=$(echo "$line" | grep -o -E 'type [^ ]+' | awk '{print $2}')

    # Fallbacks
    [ -z "$length" ] && length=null || length=$length
    [ -z "$flags" ] && flags=""
    [ -z "$type" ] && type=""
    [ -z "$proto" ] && proto="unknown"

    info="$proto packet from $src to $dst"

    # Add comma if not first element
    [ "$count" -ne 0 ] && echo ","

    # Output JSON object
    cat <<EOF
{
  "time": "$time",
  "src": "$src",
  "dst": "$dst",
  "info": "$info",
  "protocol": "$proto",
  "length": $length,
  "type": "$type",
  "flags": "$flags"
}
EOF

    count=$((count + 1))
done

# End JSON array
echo "]"
