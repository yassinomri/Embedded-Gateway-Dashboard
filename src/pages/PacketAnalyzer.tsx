import React, { useState, useEffect, useRef } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, Pause, Network, Radar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { fetchCapturedPackets } from '@/lib/packet-analyzer-api';
import { PacketData } from '@/types/packet-analyzer';
import { cn } from "@/lib/utils";

const formatTimestamp = (timestamp: string) => {
  const date = new Date(parseFloat(timestamp) * 1000);
  date.setHours(date.getHours() + 1);
  return date.toISOString().replace('T', ' ').substring(0, 19);
};

const PacketAnalyzer = () => {
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(true);
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
      capturePackets();
      intervalRef.current = setInterval(capturePackets, 60000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCapturing]);

  const toggleCapturing = () => {
    setIsCapturing((prev) => !prev);
  };

  const handleSelectPacket = (packet: PacketData) => {
    setSelectedPacket(packet === selectedPacket ? null : packet);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
              <Radar className="mr-2 h-6 w-6 text-blue-500" /> Packet Analyzer
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleCapturing}
                    aria-label={isCapturing ? 'Stop capturing packets' : 'Resume capturing packets'}
                    className={cn(
                      "flex items-center",
                      isCapturing ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                    )}
                  >
                    {isCapturing ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Resume
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCapturing ? "Stop capturing packets" : "Resume capturing packets"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>Real-time network packet capture and analysis</CardDescription>
        </CardHeader>
      </Card>

      {/* Packet Table */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table aria-label="Captured packets table">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Time</span>
                        </TooltipTrigger>
                        <TooltipContent>Packet capture timestamp</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Source</span>
                        </TooltipTrigger>
                        <TooltipContent>Source IP address</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Destination</span>
                        </TooltipTrigger>
                        <TooltipContent>Destination IP address</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Protocol</span>
                        </TooltipTrigger>
                        <TooltipContent>Network protocol used</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : packets.length > 0 ? (
                  packets.map((packet, index) => (
                    <TableRow
                      key={`packet-${index}`}
                      className={cn(
                        "transition-colors duration-200 cursor-pointer",
                        selectedPacket === packet ? "bg-blue-100" : index % 2 === 0 ? "bg-white" : "bg-gray-50",
                        selectedPacket !== packet && "hover:bg-blue-50"
                      )}
                      onClick={() => handleSelectPacket(packet)}
                      role="row"
                    >
                      <TableCell className="px-4 py-3 text-gray-700">{formatTimestamp(packet.time)}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-700">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <span className="font-mono">{packet.src}</span>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64">
                            <h4 className="text-sm font-semibold">Source Address</h4>
                            <p className="text-sm font-mono">{packet.src}</p>
                          </HoverCardContent>
                        </HoverCard>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-700">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <span className="font-mono">{packet.dst}</span>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64">
                            <h4 className="text-sm font-semibold">Destination Address</h4>
                            <p className="text-sm font-mono">{packet.dst}</p>
                          </HoverCardContent>
                        </HoverCard>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-700">{packet.protocol}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Network className="h-8 w-8 mb-2" aria-hidden="true" />
                        <span>No packets captured yet.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Packet Details */}
      {selectedPacket && (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 animate-in fade-in">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Packet Details</CardTitle>
            <CardDescription>Detailed information about the selected packet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-600">Time:</span>
                  <span className="text-sm text-gray-700">{formatTimestamp(selectedPacket.time)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-600">Source:</span>
                  <span className="text-sm font-mono text-gray-700">{selectedPacket.src}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-600">Destination:</span>
                  <span className="text-sm font-mono text-gray-700">{selectedPacket.dst}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-600">Info:</span>
                  <span className="text-sm text-gray-700">{selectedPacket.info}</span>
                </div>
                {selectedPacket.protocol && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-600">Protocol:</span>
                    <span className="text-sm text-gray-700">{selectedPacket.protocol}</span>
                  </div>
                )}
                {selectedPacket.length && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-600">Length:</span>
                    <span className="text-sm text-gray-700">{selectedPacket.length} bytes</span>
                  </div>
                )}
                {selectedPacket.type && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-600">Type:</span>
                    <span className="text-sm text-gray-700">{selectedPacket.type}</span>
                  </div>
                )}
                {selectedPacket.flags && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-600">Flags:</span>
                    <span className="text-sm text-gray-700">{selectedPacket.flags}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardContent className="flex justify-between items-center p-4">
          <div className="flex items-center space-x-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
                isCapturing ? "bg-green-500" : "bg-red-500"
              )}
              aria-hidden="true"
            />
            <span className="text-sm text-gray-700">
              {isCapturing ? 'Capturing packets' : 'Capture paused'}
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-semibold text-gray-800">
                  {packets.length} packet{packets.length !== 1 ? 's' : ''} captured
                </span>
              </TooltipTrigger>
              <TooltipContent>Total packets captured in this session</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default PacketAnalyzer;