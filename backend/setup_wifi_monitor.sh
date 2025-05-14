#!/bin/sh

# Make the wifi monitor script executable
chmod +x /www/cgi-bin/wifi_monitor.sh

# Add a cron job to run the monitor every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /www/cgi-bin/wifi_monitor.sh") | crontab -

# Create an init script to ensure the monitor starts at boot
cat > /etc/init.d/wifi_monitor << 'EOF'
#!/bin/sh /etc/rc.common

START=99
STOP=15
USE_PROCD=1

start_service() {
    procd_open_instance
    procd_set_param command /www/cgi-bin/wifi_monitor.sh
    procd_set_param stdout 1
    procd_set_param stderr 1
    procd_close_instance
    
    # Also run it immediately after boot
    /www/cgi-bin/wifi_monitor.sh &
    
    # Ensure cron is enabled and started
    /etc/init.d/cron enable
    /etc/init.d/cron start
}

EOF

# Make the init script executable
chmod +x /etc/init.d/wifi_monitor

# Enable the service to start at boot
/etc/init.d/wifi_monitor enable

# Start the service now
/etc/init.d/wifi_monitor start

# Make sure cron is enabled and running
/etc/init.d/cron enable
/etc/init.d/cron start

echo "WiFi monitor setup complete. It will run every 5 minutes and start automatically after boot."
