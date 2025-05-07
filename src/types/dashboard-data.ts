export interface DashboardData {
  firewallRulesInfo: unknown;
  memoryInfo: string; // Raw output of /proc/meminfo
  bandwidthInfo: string; // Raw output of iftop
  activeConnectionsInfo: string; // Raw output of netstat -tulnp
  connectedDevicesInfo: string; // Raw output of /tmp/dhcp.leases
  topInfo: string; // Raw output of top -bn1
  firewallStatus: {
    status: boolean; // true if firewall is running, false otherwise
    rules: {
      activeRules: string; // Number of active rules,
      totalRules: string; // Total number of rules
    }
  }
} 