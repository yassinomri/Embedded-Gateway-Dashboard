export interface DashboardData {
  memoryInfo: string; // Raw output of /proc/meminfo
  bandwidthInfo: {
    txRate: string; // Transmit rate in Mbps
    rxRate: string; // Receive rate in Mbps
  };
  activeConnectionsInfo: string; // Raw output of netstat -tulnp
  connectedDevicesInfo: string; // Raw output of /tmp/dhcp.leases
  loadaverageInfo: string; // Raw output of /proc/loadavg
  firewallStatus: {
    status: boolean; // true if firewall is running, false otherwise
    rules: {
      activeRules: number; // Number of active rules
      totalRules: number; // Total number of rules
    };
  };
}