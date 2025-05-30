export interface DashboardData {
  activeConnectionsInfo: unknown;
  networkInfo: unknown;
  memoryInfo?: string;
  loadaverageInfo?: string;
  bandwidthInfo?: {
    ethernet: {
      txRate?: string;
      rxRate?: string;
    };
    wifi: {
      txRate?: string;
      rxRate?: string;
    };
  };
  firewallStatus?: {
    status: boolean;
    rules: {
      activeRules: number;
      totalRules: number;
    };
  };
  connectedDevicesInfo?: {
    devices: {
      hostname: string;
      ip: string;
      mac: string;
      connectionType: string;
    }[];
  };
  perDeviceBandwidth?: PerDeviceBandwidth[]; // <-- Add this line
  timestamp?: number; // Add timestamp field
}

export interface PerDeviceBandwidth {
  mac: string;
  ip?: string;
  hostname?: string;
  downloadRate?: number; // Mbps
  uploadRate?: number;   // Mbps
  totalBytes?: number;   // Optional: total bytes transferred
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
