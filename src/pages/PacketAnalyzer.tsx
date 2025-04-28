import React, { useState, useEffect } from 'react';
import { fetchCapturedPackets } from '@/lib/packet-analyzer-api';
import { PacketData } from '@/types/packet-analyzer';

// Helper function to format the timestamp
const formatTimestamp = (timestamp: string) => {
  const date = new Date(parseFloat(timestamp) * 1000); // Convert to milliseconds
  return date.toISOString().replace('T', ' ').substring(0, 19); // Format as 'YYYY-MM-DD HH:mm:ss'
};

const PacketAnalyzer = () => {
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Start capturing when the page loads
  useEffect(() => {
    const capturePackets = async () => {
      try {
        const data = await fetchCapturedPackets();
        setPackets(data);
      } catch (error) {
        console.error("Error capturing packets", error);
      }
    };

    // Start the capture immediately when the component loads
    capturePackets();

    // Optionally, you can set an interval to refresh packets every 5 seconds:
    const intervalId = setInterval(capturePackets, 5000);

    // Cleanup the interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, []);  // Empty dependency array means it runs once when the component mounts

  const handleStartCapture = async () => {
    setIsCapturing(true);
    await fetchCapturedPackets(); // Start capturing packets immediately
  };

  const handleStopCapture = () => {
    setIsCapturing(false);
  };

  return (
    <div>
      <h1>Packet Analyzer</h1>
      {isCapturing ? (
        <button onClick={handleStopCapture}>Stop Capturing</button>
      ) : (
        <button onClick={handleStartCapture}>Start Capturing</button>
      )}

      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Info</th>
          </tr>
        </thead>
        <tbody>
          {packets.length > 0 ? (
            packets.map((packet, index) => (
              <tr key={index}>
                <td>{formatTimestamp(packet.time)}</td> {/* Format the time */}
                <td>{packet.src}</td>
                <td>{packet.dst}</td>
                <td>{packet.info}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No packets captured yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PacketAnalyzer;
