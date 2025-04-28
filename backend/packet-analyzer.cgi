#!/bin/sh

# Required for CGI headers
echo "Content-type: application/json"
echo ""

# Capture 5 packets from any interface (adjust tcpdump options as needed)
PACKETS=$(tcpdump -c 5 -nn -q -tt | awk '
BEGIN {
    print "["
}
{
    # Escape quotes and format fields
    if (NR > 1) {
        printf(",")
    }
    printf("{\"time\":\"%s\",\"src\":\"%s\",\"dst\":\"%s\",\"info\":\"%s\"}", $1, $3, $5, $6)
}
END {
    print "]"
}')

echo "$PACKETS"