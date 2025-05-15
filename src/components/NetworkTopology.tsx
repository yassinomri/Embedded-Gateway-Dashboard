import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PacketData } from '@/types/packet-analyzer';

interface NetworkTopologyProps {
  packets: PacketData[];
}

// Define types for nodes and links
interface Node {
  id: string;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({ packets }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!packets.length || !svgRef.current) return;

    // Extract unique nodes (IPs) from packets
    const nodes: Node[] = [];
    const nodeMap = new Map<string, number>();
    
    // Create links between nodes
    const links: Link[] = [];
    const linkMap = new Map<string, number>();

    // Process packets to build network graph
    packets.forEach(packet => {
      // Add source node if not exists
      if (!nodeMap.has(packet.src)) {
        nodeMap.set(packet.src, 1); // Group 1 for internal IPs
        nodes.push({ id: packet.src, group: isInternalIP(packet.src) ? 1 : 2 });
      }
      
      // Add destination node if not exists
      if (!nodeMap.has(packet.dst)) {
        nodeMap.set(packet.dst, 1);
        nodes.push({ id: packet.dst, group: isInternalIP(packet.dst) ? 1 : 2 });
      }
      
      // Add or update link
      const linkId = `${packet.src}-${packet.dst}`;
      const existingValue = linkMap.get(linkId) || 0;
      linkMap.set(linkId, existingValue + 1);
      
      // Find existing link or create new one
      const existingLink = links.find(l => l.source === packet.src && l.target === packet.dst);
      if (existingLink) {
        existingLink.value += 1;
      } else {
        links.push({ source: packet.src, target: packet.dst, value: 1 });
      }
    });

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up the SVG container
    const width = svgRef.current.clientWidth;
    const height = 300;
    
    // Create a force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Create the SVG elements
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
      
    // Add links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    // Add nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 5)
      .attr("fill", (d) => d.group === 1 ? "#3b82f6" : "#ef4444")
      .call(drag(simulation));

    // Add labels
    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text((d) => d.id)
      .attr("font-size", "10px")
      .attr("dx", 8)
      .attr("dy", ".35em");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x || 0)
        .attr("y1", d => (d.source as Node).y || 0)
        .attr("x2", d => (d.target as Node).x || 0)
        .attr("y2", d => (d.target as Node).y || 0);

      node
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0);
        
      label
        .attr("x", d => d.x || 0)
        .attr("y", d => d.y || 0);
    });

    // Drag functionality
    function drag(simulation: d3.Simulation<Node, undefined>) {
      function dragstarted(event: d3.D3DragEvent<Element, Node, Node>, d: Node) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event: d3.D3DragEvent<Element, Node, Node>, d: Node) {
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event: d3.D3DragEvent<Element, Node, Node>, d: Node) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      
      return d3.drag<Element, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [packets]);

  // Helper function to determine if an IP is internal
  const isInternalIP = (ip: string): boolean => {
    return ip.startsWith('192.168.') || 
           ip.startsWith('10.') || 
           ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) !== null ||
           ip === '127.0.0.1';
  };

  return (
    <div className="w-full overflow-hidden">
      <svg ref={svgRef} className="w-full"></svg>
    </div>
  );
};
