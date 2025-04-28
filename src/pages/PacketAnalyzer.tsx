
import React, { useState, useEffect, useRef } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const capturePackets = async () => {
    try {
      setIsLoading(true);
      const data = await fetchCapturedPackets();
      setPackets(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error capturing packets", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isCapturing) {
      capturePackets(); // capture immediately
      intervalRef.current = setInterval(capturePackets, 60000); // capture every 60 seconds
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

      <div className="packet-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                </TableRow>
              ))
            ) : packets.length > 0 ? (
              packets.map((packet, index) => (
                <TableRow
                  key={`packet-${index}`}
                  className={selectedPacket === packet ? 'selected-row' : ''}
                  onClick={() => handleSelectPacket(packet)}
                >
                  <TableCell>{formatTimestamp(packet.time)}</TableCell>
                  <TableCell>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <span className="src-address">{packet.src}</span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold">Source Address</h4>
                            <p className="text-sm">{packet.src}</p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>
                  <TableCell>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <span className="dst-address">{packet.dst}</span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold">Destination Address</h4>
                            <p className="text-sm">{packet.dst}</p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>
                  <TableCell>{packet.info}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="no-data">
                  No packets captured yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedPacket && (
        <section className="packet-details">
          <h2>Packet Details</h2>
          <div className="details-content">
            <div className="detail-card">
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
            </div>
            <div className="detail-card">
              <div className="detail-item">
                <span className="detail-label">Info:</span>
                <span className="detail-value">{selectedPacket.info}</span>
              </div>
              {selectedPacket.protocol && (
                <div className="detail-item">
                  <span className="detail-label">Protocol:</span>
                  <span className="detail-value">{selectedPacket.protocol}</span>
                </div>
              )}
              {selectedPacket.length && (
                <div className="detail-item">
                  <span className="detail-label">Length:</span>
                  <span className="detail-value">{selectedPacket.length} bytes</span>
                </div>
              )}
              {selectedPacket.type && (
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{selectedPacket.type}</span>
                </div>
              )}
              {selectedPacket.flags && (
                <div className="detail-item">
                  <span className="detail-label">Flags:</span>
                  <span className="detail-value">{selectedPacket.flags}</span>
                </div>
              )}
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
          <Button 
            className="capture-button"
            onClick={toggleCapturing}
            aria-label={isCapturing ? 'Stop Capturing' : 'Resume Capturing'}
            variant="default"
          >
            {isCapturing ? (
              <>
                <Pause className="mr-2 h-4 w-4" /> Stop Capturing
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Resume Capturing
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default PacketAnalyzer;