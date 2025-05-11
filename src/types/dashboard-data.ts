export interface DashboardData {
  activeConnectionsInfo: unknown;
  networkInfo: unknown;
  memoryInfo?: string;
  loadaverageInfo?: string;
  bandwidthInfo?: {
    txRate?: string;
    rxRate?: string;
  };
  firewallStatus?: {
    totalRules: number;
    activeRules: number;
    status: boolean;
    rules: number;
  };
  connectedDevicesInfo?: {
    devices: {
      hostname: string;
      ip: string;
      mac: string;
      connectionType: string;
    }[];
  };
  timestamp?: number; // Add timestamp field
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
