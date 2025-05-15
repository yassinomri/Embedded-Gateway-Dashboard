import React from "react";
import { PacketData } from "@/types/packet-analyzer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface PacketAnalyzerTableProps {
  packets: PacketData[];
}

export const PacketAnalyzerTable: React.FC<PacketAnalyzerTableProps> = ({ packets }) => {
  // Function to format timestamp
  const formatTime = (timestamp: string) => {
    try {
      // Convert Unix timestamp to Date
      const date = new Date(Number(timestamp) * 1000);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return timestamp;
    }
  };

  // Function to get protocol badge color
  const getProtocolColor = (protocol: string) => {
    switch (protocol.toLowerCase()) {
      case "tcp":
        return "bg-blue-500";
      case "udp":
        return "bg-green-500";
      case "icmp":
        return "bg-yellow-500";
      case "arp":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  // Function to get direction badge color
  const getDirectionColor = (direction: string) => {
    switch (direction.toLowerCase()) {
      case "inbound":
        return "bg-red-500";
      case "outbound":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Time</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead className="w-[100px]">Protocol</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[80px]">Length</TableHead>
            <TableHead className="w-[100px]">Direction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packets.map((packet, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-xs">
                {formatTime(packet.time)}
              </TableCell>
              <TableCell>
                {packet.src}
                {packet.src_port && `:${packet.src_port}`}
              </TableCell>
              <TableCell>
                {packet.dst}
                {packet.dst_port && `:${packet.dst_port}`}
              </TableCell>
              <TableCell>
                <Badge className={getProtocolColor(packet.protocol)}>
                  {packet.protocol.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>{packet.type}</TableCell>
              <TableCell>{packet.length} bytes</TableCell>
              <TableCell>
                <Badge className={getDirectionColor(packet.direction)}>
                  {packet.direction}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};