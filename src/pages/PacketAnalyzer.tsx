import React, { useState, useEffect, useRef } from 'react';
import { fetchCapturedPackets } from '@/lib/packet-analyzer-api';
import { PacketData } from '@/types/packet-analyzer';
import '@/styles/PacketAnalyzer.css';

const formatTimestamp = (timestamp: string) => {
  const date = new Date(parseFloat(timestamp) * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
};

const PacketAnalyzer = () => {
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(true); // capturing enabled by default
  const [selectedPacket, setSelectedPacket] = useState<PacketData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const capturePackets = async () => {
    try {
      const data = await fetchCapturedPackets();
      setPackets(data);
    } catch (error) {
      console.error("Error capturing packets", error);
    }
  };

  useEffect(() => {
    if (isCapturing) {
      capturePackets(); // capture immediately
      intervalRef.current = setInterval(capturePackets, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCapturing]); // only run this when isCapturing changes

  const toggleCapturing = () => {
    setIsCapturing((prev) => !prev);
  };

  const handleSelectPacket = (packet: PacketData) => {
    setSelectedPacket(packet === selectedPacket ? null : packet);
  };

  return (
    <div className="packet-analyzer-container">
      <header className="packet-analyzer-header">
        <h1>Packet Analyzer</h1>
      </header>

      <section className="packet-table-container">
        <table className="packet-table">
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
                <tr
                  key={index}
                  className={selectedPacket === packet ? 'selected-row' : ''}
                  onClick={() => handleSelectPacket(packet)}
                >
                  <td>{formatTimestamp(packet.time)}</td>
                  <td>{packet.src}</td>
                  <td>{packet.dst}</td>
                  <td>{packet.info}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="no-data">
                  No packets captured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {selectedPacket && (
        <section className="packet-details">
          <h2>Packet Details</h2>
          <div className="details-content">
            <div className="detail-item">
              <span className="detail-label">Time:</span>
              <span className="detail-value">{formatTimestamp(selectedPacket.time)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Source:</span>
              <span className="detail-value">{selectedPacket.src}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Destination:</span>
              <span className="detail-value">{selectedPacket.dst}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Info:</span>
              <span className="detail-value">{selectedPacket.info}</span>
            </div>
          </div>
        </section>
      )}

      <footer className="status-bar">
        <div className="status-indicator">
          <span className={`status-dot ${isCapturing ? 'active' : 'inactive'}`}></span>
          <span className="status-text">{isCapturing ? 'Capturing' : 'Paused'}</span>
        </div>

        <div className="packet-count">
          {packets.length} packet{packets.length !== 1 ? 's' : ''} captured
        </div>

        <div className="capture-button-container">
          <button className="capture-button" onClick={toggleCapturing}>
            {isCapturing ? 'Stop Capturing' : 'Resume Capturing'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PacketAnalyzer;
