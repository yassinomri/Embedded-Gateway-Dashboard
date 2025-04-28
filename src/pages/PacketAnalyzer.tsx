"use client";

import { useEffect, useState } from "react";
import { fetchCapturedPackets } from "@/lib/packet-analyzer-api";
import { PacketData } from "@/types/packet-analyzer";

export default function PacketAnalyzer() {
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  async function loadPackets() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchCapturedPackets();
      setPackets(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCaptureToggle() {
    if (!isCapturing) {
      // Start capturing
      setIsCapturing(true);
      loadPackets();  // Fetch once
    } else {
      // Stop capturing
      setIsCapturing(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Packet Analyzer</h1>

      <button
        onClick={handleCaptureToggle}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4"
      >
        {isCapturing ? "Stop Capturing" : "Start Capturing"}
      </button>

      {loading && <div>Loading packets...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {!loading && packets.length > 0 && (
        <table className="table-auto w-full mt-4">
          <thead>
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Info</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((pkt, index) => (
              <tr key={index}>
                <td className="border px-4 py-2">{pkt.time}</td>
                <td className="border px-4 py-2">{pkt.src}</td>
                <td className="border px-4 py-2">{pkt.dst}</td>
                <td className="border px-4 py-2">{pkt.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && packets.length === 0 && (
        <div className="text-gray-500 mt-4">No packets captured yet.</div>
      )}
    </div>
  );
}
