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
  networkInfo: NetworkInterface[]; // Parsed output of network information
}

export interface NetworkInterface {
  interface: string; // Interface name (e.g., br-lan, eth0)
  hwaddr?: string; // MAC address
  inet?: string; // IPv4 address
  cidr?: string; // CIDR notation (e.g., "24" for /24)
  inet6?: string; // IPv6 address
  mask?: string; // Subnet mask (may not be present with new ip command approach)
  bcast?: string; // Broadcast address
  mtu?: string; // MTU value
  rx_bytes?: string; // Received bytes (renamed from rxBytes to match JSON)
  tx_bytes?: string; // Transmitted bytes (renamed from txBytes to match JSON)
  rx_packets?: string; // Received packets (renamed from rxPackets to match JSON)
  tx_packets?: string; // Transmitted packets (renamed from txPackets to match JSON)
}