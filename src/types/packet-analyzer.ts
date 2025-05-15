export interface PacketData {
  time: string;
  src: string;
  src_port: number | null;
  dst: string;
  dst_port: number | null;
  info: string;
  protocol: string;
  length: number;
  type: string;
  flags: string;
  ttl: number | null;
  direction: string;
}

export interface PacketFilterOptions {
  count: number;
  interface: string;
  filter: string;
}

export interface PacketStatistics {
  totalPackets: number;
  protocolDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  directionDistribution: Record<string, number>;
  averagePacketSize: number;
}
