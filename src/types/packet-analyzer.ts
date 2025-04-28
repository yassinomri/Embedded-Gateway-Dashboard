export interface PacketData {
  time: string;
  src: string;
  dst: string;
  info: string;
  protocol?: string;
  length?: number;
  type?: string;
  flags?: string;
}
