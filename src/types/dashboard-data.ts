export interface DashboardData {
    memoryInfo: string; // Raw output of /proc/meminfo
    bandwidthInfo: string; // Raw output of iftop
    activeConnectionsInfo: string; // Raw output of netstat -tulnp
    firewallRulesInfo: string; // Raw output of iptables -L -v -n
    connectedDevicesInfo: string; // Raw output of /tmp/dhcp.leases
    topInfo: string; // Raw output of top -bn1
  }