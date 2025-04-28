// src/api/packet-analyzer.ts

import { PacketData } from "@/types/packet-analyzer";

export async function fetchCapturedPackets(): Promise<PacketData[]> {
  const res = await fetch("/cgi-bin/packet-analyzer.cgi");

  if (!res.ok) {
    throw new Error("Failed to fetch captured packets");
  }

  const data = await res.json(); // ✅ Correct parsing!

  return data as PacketData[]; // ✅ Tell TypeScript it is an array of PacketData
}
