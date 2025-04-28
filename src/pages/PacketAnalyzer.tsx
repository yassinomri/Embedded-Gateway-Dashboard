import { useEffect, useState } from "react";
import { fetchCapturedPackets } from "@/lib/packet-analyzer-api";
import { PacketData } from "@/types/packet-analyzer";

export default function PacketAnalyzer() {
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function loadPackets() {
      try {
        const data = await fetchCapturedPackets();
        setPackets(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadPackets(); // First fetch immediately

    // eslint-disable-next-line prefer-const
    intervalId = setInterval(loadPackets, 5000); // Repeat every 5 seconds

    return () => clearInterval(intervalId); // Clean up
  }, []);

  if (loading) return <div>Loading packets...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Packet Analyzer</h1>
      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Time</th>
            <th className="border px-4 py-2">Source</th>
            <th className="border px-4 py-2">Destination</th>
            <th className="border px-4 py-2">Info</th>
          </tr>
        </thead>
        <tbody>
          {packets.map((packet, index) => (
            <tr key={index} className="text-center">
              <td className="border px-4 py-2">{packet.time}</td>
              <td className="border px-4 py-2">{packet.src}</td>
              <td className="border px-4 py-2">{packet.dst}</td>
              <td className="border px-4 py-2">{packet.info}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
