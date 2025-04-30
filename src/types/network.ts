export interface NetworkData {
  interfaces: {
    id: string;
    name: string;
    status: string;
    macAddress: string;
    ipAddress: string;
    netmask: string;
    gateway?: string;
  }[];
}

export interface WirelessConfig {
  ssid: string;
  password: string;
  channel: string;
  encryption: string;
  enabled: boolean;
}

export interface DhcpDnsConfig {
  dhcpEnabled: boolean;
  rangeStart: string;
  rangeEnd: string;
  leaseTime: string; 
  dhcpv6: string;
  ra: string;
  raSlaac: boolean;
  raFlags: string[];
  primaryDns: string;
  secondaryDns: string;
}