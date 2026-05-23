#!/bin/sh

echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo ""

echo "QUERY_STRING: $QUERY_STRING" >&2

# URL decode the query string first
DECODED_QUERY=$(echo "$QUERY_STRING" | sed 's/%3A/:/g; s/%3a/:/g')

ACTION=$(echo "$DECODED_QUERY" | awk -F'action=' '{print $2}' | awk -F'&' '{print $1}')
MAC=$(echo "$DECODED_QUERY" | awk -F'mac=' '{print $2}' | awk -F'&' '{print $1}')
LIMIT=$(echo "$DECODED_QUERY" | awk -F'limit=' '{print $2}' | awk -F'&' '{print $1}')

# Debug output
echo "DEBUG: Original QUERY_STRING: $QUERY_STRING" >&2
echo "DEBUG: Decoded QUERY_STRING: $DECODED_QUERY" >&2
echo "DEBUG: MAC: $MAC" >&2

case "$ACTION" in
  info)
    # Normalize MAC to lowercase
    MAC=$(echo "$MAC" | tr 'A-F' 'a-f')

    # Try all WiFi interfaces
    INFO=""
    for iface in $(iw dev | awk '$1=="Interface"{print $2}'); do
      INFO=$(iw dev "$iface" station get "$MAC" 2>/dev/null)
      [ -n "$INFO" ] && break
    done

    if [ -z "$INFO" ]; then
      echo "{\"status\": \"error\", \"message\": \"Device not found\"}"
      exit 0
    fi

    RX_BYTES=$(echo "$INFO" | awk '/rx bytes:/ {print $3}')
    TX_BYTES=$(echo "$INFO" | awk '/tx bytes:/ {print $3}')
    RX_PACKETS=$(echo "$INFO" | awk '/rx packets:/ {print $3}')
    TX_PACKETS=$(echo "$INFO" | awk '/tx packets:/ {print $3}')
    TX_BITRATE=$(echo "$INFO" | awk '/tx bitrate:/ {print $3, $4}')
    RX_BITRATE=$(echo "$INFO" | awk '/rx bitrate:/ {print $3, $4}')
    CONNECTED_TIME=$(echo "$INFO" | awk '/connected time:/ {print $3, $4}')
    AUTHORIZED=$(echo "$INFO" | awk '/authorized:/ {print $2}')
    ASSOCIATED=$(echo "$INFO" | awk '/associated:/ {print $2}')
    echo "{
      \"status\": \"success\",
      \"mac\": \"$MAC\",
      \"rx_bytes\": $RX_BYTES,
      \"tx_bytes\": $TX_BYTES,
      \"rx_packets\": $RX_PACKETS,
      \"tx_packets\": $TX_PACKETS,
      \"tx_bitrate\": \"$TX_BITRATE\",
      \"rx_bitrate\": \"$RX_BITRATE\",
      \"connected_time\": \"$CONNECTED_TIME\",
      \"authorized\": \"$AUTHORIZED\",
      \"associated\": \"$ASSOCIATED\"
    }"
    ;;
  disconnect)
    # Deauthenticate first (optional, for immediate effect)
    hostapd_cli -i phy0-ap0 deauthenticate "$MAC" >/dev/null 2>&1

    # Add a UCI firewall rule to block this MAC if not already present
    RULE_NAME="block_$MAC"
    # Check if rule already exists
    uci show firewall | grep "$RULE_NAME" >/dev/null 2>&1
    if [ $? -ne 0 ]; then
      uci add firewall rule > /dev/null
      uci set firewall.@rule[-1].name="$RULE_NAME"
      uci set firewall.@rule[-1].src='lan'
      uci set firewall.@rule[-1].dest='*'
      uci set firewall.@rule[-1].src_mac="$MAC"
      uci set firewall.@rule[-1].target='REJECT'
      uci set firewall.@rule[-1].enabled='1'
      uci commit firewall
      /etc/init.d/firewall reload
      echo "{\"status\": \"success\", \"message\": \"Device $MAC blocked by firewall rule\"}"
    else
      echo "{\"status\": \"success\", \"message\": \"Device $MAC already blocked by firewall rule\"}"
    fi
    ;;
  limit)
    IFACE="br-lan"  # Change this to your LAN interface if different

    # Ensure root qdisc and parent class exist
    tc qdisc show dev $IFACE | grep 'htb 1:' >/dev/null 2>&1 || \
      tc qdisc add dev $IFACE root handle 1: htb default 30

    tc class show dev $IFACE | grep 'class htb 1:1 ' >/dev/null 2>&1 || \
      tc class add dev $IFACE parent 1: classid 1:1 htb rate 1000mbit ceil 1000mbit

    # Use MAC (without colons) as a unique classid suffix (e.g., 1:10e5)
    CLASSID_SUFFIX=$(echo $MAC | sed 's/://g' | tail -c 5)
    CLASSID="1:1${CLASSID_SUFFIX}"

    # Delete any existing class/filter for this MAC
    tc filter del dev $IFACE parent 1:0 protocol ip prio 1 2>/dev/null
    tc class del dev $IFACE classid $CLASSID 2>/dev/null

    # Add child class for this MAC
    tc class add dev $IFACE parent 1:1 classid $CLASSID htb rate ${LIMIT}mbit ceil ${LIMIT}mbit

    # Add a filter to match source MAC
    tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 \
      match u16 0x0800 0xFFFF at -2 \
      match ether src $MAC \
      flowid $CLASSID

    echo "{\"status\": \"success\", \"message\": \"Bandwidth for $MAC limited to $LIMIT Mbps\"}"
    ;;
  *)
    echo "{\"status\": \"error\", \"message\": \"Unknown action\"}"
    ;;
esac