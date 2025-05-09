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
  networkInfo: NetworkInterface[]; // Parsed output of ifconfig
}

export interface NetworkInterface {
  interface: string; // Interface name (e.g., br-lan, eth0)
  hwaddr: string; // MAC address
  inet: string; // IPv4 address
  inet6: string; // IPv6 address
  mask: string; // Subnet mask
  bcast: string; // Broadcast address
  mtu: string; // MTU value
  rxBytes: string; // Received bytes
  txBytes: string; // Transmitted bytes
  rxPackets: string; // Received packets
  txPackets: string; // Transmitted packets
}