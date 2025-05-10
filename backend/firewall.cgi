#!/bin/sh

# Debug log
echo "$(date): Shebang /bin/sh running" >> /tmp/firewall_cgi.log
echo "$(date): REQUEST_METHOD=$REQUEST_METHOD" >> /tmp/firewall_cgi.log

# Send CORS headers
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: POST, GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type"
echo

# Handle preflight OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "$(date): OPTIONS request - CORS preflight" >> /tmp/firewall_cgi.log
    echo "{\"status\": \"success\", \"message\": \"CORS preflight\"}"
    exit 0
fi

# Handle GET request to fetch firewall rules
if [ "$REQUEST_METHOD" = "GET" ]; then
    echo "$(date): GET request started" >> /tmp/firewall_cgi.log

    # Get enabled status
    ENABLED=$(uci get firewall.@defaults[0].enabled 2>/dev/null || echo 1)
    echo "$(date): Enabled fetched: $ENABLED" >> /tmp/firewall_cgi.log

    # Build JSON manually
    JSON="{\"enabled\": $ENABLED, \"rules\": ["
    FIRST=1
    i=0
    while uci get firewall.@rule[$i] >/dev/null 2>&1; do
        echo "$(date): Processing rule $i" >> /tmp/firewall_cgi.log
        [ $FIRST -eq 0 ] && JSON="$JSON,"
        NAME=$(uci get firewall.@rule[$i].name 2>/dev/null || echo "Rule-$i")
        SRC=$(uci get firewall.@rule[$i].src 2>/dev/null || echo "any")
        DEST=$(uci get firewall.@rule[$i].dest 2>/dev/null || echo "any")
        PROTO=$(uci get firewall.@rule[$i].proto 2>/dev/null || echo "all")
        TARGET=$(uci get firewall.@rule[$i].target 2>/dev/null || echo "ACCEPT")
        RULE_ENABLED=$(uci get firewall.@rule[$i].enabled 2>/dev/null || echo 1)
        JSON="$JSON{\"id\": \"rule-$i\", \"name\": \"$NAME\", \"src\": \"$SRC\", \"dest\": \"$DEST\", \"proto\": \"$PROTO\", \"target\": \"$TARGET\", \"enabled\": $RULE_ENABLED}"
        echo "$(date): Rule $i: name=$NAME, src=$SRC, dest=$DEST" >> /tmp/firewall_cgi.log
        FIRST=0
        i=$((i + 1))
    done
    JSON="$JSON]}"

    echo "$(date): Parsed - $JSON" >> /tmp/firewall_cgi.log
    echo "$JSON"
    echo "$(date): GET response sent: $JSON" >> /tmp/firewall_cgi.log
    exit 0
fi

# Handle POST request to update, add, or delete firewall rules
if [ "$REQUEST_METHOD" = "POST" ]; then
    echo "$(date): POST request started" >> /tmp/firewall_cgi.log
    read -t 1 -r POST_DATA
    echo "$(date): POST_DATA=$POST_DATA" >> /tmp/firewall_cgi.log

    # Parse action
    ACTION=$(echo "$POST_DATA" | sed -n 's/.*"action"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
    echo "$(date): Action: $ACTION" >> /tmp/firewall_cgi.log

    # Handle delete action
    if [ "$ACTION" = "delete" ]; then
        ID=$(echo "$POST_DATA" | sed -n 's/.*"id"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
        echo "$(date): Delete ID: $ID" >> /tmp/firewall_cgi.log
        if [ -n "$ID" ]; then
            INDEX=$(echo "$ID" | sed 's/rule-//')
            if uci get firewall.@rule[$INDEX] >/dev/null 2>&1; then
                uci delete firewall.@rule[$INDEX] 2>/dev/null
                uci commit firewall 2>/dev/null
                /etc/init.d/firewall reload 2>/dev/null
                echo "$(date): Rule $ID deleted" >> /tmp/firewall_cgi.log
                echo "{\"status\": \"success\", \"message\": \"Rule deleted\"}"
            else
                echo "$(date): ERROR: Rule $ID not found" >> /tmp/firewall_cgi.log
                echo "{\"status\": \"error\", \"message\": \"Rule not found\"}"
            fi
        else
            echo "$(date): ERROR: Invalid ID for delete" >> /tmp/firewall_cgi.log
            echo "{\"status\": \"error\", \"message\": \"Invalid rule ID\"}"
        fi
        exit 0
    fi

    # Parse global enabled status
    ENABLED=$(echo "$POST_DATA" | sed -n 's/.*"enabled"[ ]*:[ ]*\([^,}\ ]*\).*/\1/p')
    if [ "$ENABLED" = "true" ] || [ "$ENABLED" = "false" ]; then
        [ "$ENABLED" = "true" ] && UCI_ENABLED="1" || UCI_ENABLED="0"
        uci set firewall.@defaults[0].enabled="$UCI_ENABLED" 2>/dev/null
    fi

    # Parse rules array for add or update
    RULES=$(echo "$POST_DATA" | sed -n 's/.*"rules"[ ]*:[ ]*\[\([^]]*\)\].*/\1/p')
    if [ -n "$RULES" ]; then
        # Split rules
        echo "$RULES" | grep -o "{[^}]*}" | while IFS= read -r rule; do
            if [ "$ACTION" = "add" ]; then
                # Add new rule
                NAME=$(echo "$rule" | sed -n 's/.*"name"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                SRC=$(echo "$rule" | sed -n 's/.*"src"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                DEST=$(echo "$rule" | sed -n 's/.*"dest"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                PROTO=$(echo "$rule" | sed -n 's/.*"proto"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                TARGET=$(echo "$rule" | sed -n 's/.*"target"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                ENABLED_RULE=$(echo "$rule" | sed -n 's/.*"enabled"[ ]*:[ ]*\([^,}\ ]*\).*/\1/p')

                if [ -n "$NAME" ]; then
                    NEW_RULE=$(uci add firewall rule 2>/dev/null)
                    uci set "firewall.$NEW_RULE.name=$NAME" 2>/dev/null
                    [ -n "$SRC" ] && uci set "firewall.$NEW_RULE.src=$SRC" 2>/dev/null
                    [ -n "$DEST" ] && uci set "firewall.$NEW_RULE.dest=$DEST" 2>/dev/null
                    [ -n "$PROTO" ] && uci set "firewall.$NEW_RULE.proto=$PROTO" 2>/dev/null
                    [ -n "$TARGET" ] && uci set "firewall.$NEW_RULE.target=$TARGET" 2>/dev/null
                    [ "$ENABLED_RULE" = "true" ] && uci set "firewall.$NEW_RULE.enabled=1" 2>/dev/null
                    [ "$ENABLED_RULE" = "false" ] && uci set "firewall.$NEW_RULE.enabled=0" 2>/dev/null
                fi
            else
                # Update existing rule
                ID=$(echo "$rule" | sed -n 's/.*"id"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                NAME=$(echo "$rule" | sed -n 's/.*"name"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                SRC=$(echo "$rule" | sed -n 's/.*"src"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                DEST=$(echo "$rule" | sed -n 's/.*"dest"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                PROTO=$(echo "$rule" | sed -n 's/.*"proto"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                TARGET=$(echo "$rule" | sed -n 's/.*"target"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
                ENABLED_RULE=$(echo "$rule" | sed -n 's/.*"enabled"[ ]*:[ ]*\([^,}\ ]*\).*/\1/p')

                if [ -n "$ID" ]; then
                    [ -n "$NAME" ] && uci set "$ID.name=$NAME" 2>/dev/null
                    [ -n "$SRC" ] && uci set "$ID.src=$SRC" 2>/dev/null
                    [ -n "$DEST" ] && uci set "$ID.dest=$DEST" 2>/dev/null
                    [ -n "$PROTO" ] && uci set "$ID.proto=$PROTO" 2>/dev/null
                    [ -n "$TARGET" ] && uci set "$ID.target=$TARGET" 2>/dev/null
                    if [ "$ENABLED_RULE" = "true" ] || [ "$ENABLED_RULE" = "false" ]; then
                        [ "$ENABLED_RULE" = "true" ] && UCI_ENABLED_RULE="1" || UCI_ENABLED_RULE="0"
                        uci set "$ID.enabled=$UCI_ENABLED_RULE" 2>/dev/null
                    fi
                fi
            fi
        done
        uci commit firewall 2>/dev/null
        /etc/init.d/firewall reload 2>/dev/null
    fi

    RESPONSE="{\"status\": \"success\", \"message\": \"$([ "$ACTION" = "add" ] && echo "Rule added" || echo "Firewall updated")\"}"
    echo "$RESPONSE"
    echo "$(date): POST response sent: $RESPONSE" >> /tmp/firewall_cgi.log
    exit 0
fi

# Unknown method
echo "{\"status\": \"error\", \"message\": \"Unsupported method: $REQUEST_METHOD\"}"
echo "$(date): Unknown method: $REQUEST_METHOD" >> /tmp/firewall_cgi.log