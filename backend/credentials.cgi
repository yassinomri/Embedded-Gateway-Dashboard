#!/bin/sh

echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Allow-Methods: POST, GET, OPTIONS"
echo "Access-Control-Allow-Headers: Content-Type, Pragma, Cache-Control"
echo

CRED_FILE="/etc/admin-credentials"

# Read POST data
read_input() {
  read -n "$CONTENT_LENGTH" POST_DATA
  echo "$POST_DATA"
}

# Improved JSON parsing function
parse_json() {
  echo "$1" | sed -E 's/.*"'$2'"\s*:\s*"?([^",}]*)"?[ ,}].*/\1/'
}

respond_json() {
  echo "$1"
}

ACTION=$(echo "$QUERY_STRING" | sed -n 's/.*action=\([^&]*\).*/\1/p')

# Handle OPTIONS request for CORS preflight
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  exit 0
fi

# Handle GET request - we'll use POST for login validation instead
if [ "$REQUEST_METHOD" = "GET" ]; then
  respond_json '{"success":false,"error":"Use POST for credential validation"}'
  exit 1
fi

if [ "$REQUEST_METHOD" = "POST" ]; then
  DATA=$(read_input)
  USERNAME=$(parse_json "$DATA" "username")
  PASSWORD=$(parse_json "$DATA" "password")
  CURRENT_PASSWORD=$(parse_json "$DATA" "currentPassword")
  NEWPASSWORD=$(parse_json "$DATA" "newPassword")
else
  respond_json '{"error":"Invalid request method"}'
  exit 1
fi

# Create default credentials if file doesn't exist
if [ ! -f "$CRED_FILE" ]; then
  echo "admin:admin" > "$CRED_FILE"
fi

# Debugging information
echo "DATA: $DATA" >> /tmp/cred-debug.log
echo "USERNAME: $USERNAME" >> /tmp/cred-debug.log
echo "PASSWORD: $PASSWORD" >> /tmp/cred-debug.log

case "$ACTION" in
  login)
    if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
      respond_json '{"success":false,"error":"Username and password required"}'
      exit 1
    fi

    # Read credentials here, after file is created if missing
    if [ ! -f "$CRED_FILE" ]; then
      echo "admin:admin" > "$CRED_FILE"
    fi
    STORED_USER=$(cut -d: -f1 "$CRED_FILE" | tr -d '\r\n')
    STORED_PASS=$(cut -d: -f2- "$CRED_FILE" | tr -d '\r\n')

    echo "Comparing '$USERNAME' with '$STORED_USER'" >> /tmp/cred-debug.log
    echo "Comparing '$PASSWORD' with '$STORED_PASS'" >> /tmp/cred-debug.log

    if [ "$USERNAME" = "$STORED_USER" ] && [ "$PASSWORD" = "$STORED_PASS" ]; then
      respond_json '{"success":true}'
    else
      respond_json '{"success":false,"error":"Invalid credentials"}'
    fi
    ;;
  change)
    if [ -z "$USERNAME" ] || [ -z "$CURRENT_PASSWORD" ] || [ -z "$NEWPASSWORD" ]; then
      respond_json '{"success":false,"error":"Username, current password, and new password required"}'
      exit 1
    fi

    # Read credentials here, after file is created if missing
    if [ ! -f "$CRED_FILE" ]; then
      echo "admin:admin" > "$CRED_FILE"
    fi
    STORED_USER=$(cut -d: -f1 "$CRED_FILE" | tr -d '\r\n')
    STORED_PASS=$(cut -d: -f2- "$CRED_FILE" | tr -d '\r\n')

    echo "Comparing '$USERNAME' with '$STORED_USER'" >> /tmp/cred-debug.log
    echo "Comparing '$PASSWORD' with '$STORED_PASS'" >> /tmp/cred-debug.log

    if [ "$USERNAME" = "$STORED_USER" ] && [ "$CURRENT_PASSWORD" = "$STORED_PASS" ]; then
      echo "$USERNAME:$NEWPASSWORD" > "$CRED_FILE"
      respond_json '{"success":true,"message":"Credentials updated successfully"}'
    else
      respond_json '{"success":false,"error":"Current password incorrect"}'
    fi
    ;;
  *)
    respond_json '{"success":false,"error":"Unknown action"}'
    ;;
  

esac