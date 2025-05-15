import React, { useState, useEffect } from "react";
import { fetchCapturedPackets } from "@/lib/packet-analyzer-api";
import { PacketData, PacketFilterOptions, PacketStatistics } from "@/types/packet-analyzer";
import { PacketAnalyzerTable } from "@/components/PacketAnalyzerTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter, Download, Radar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Doughnut, Bar } from "react-chartjs-2";
import { useToast } from "@/hooks/use-toast";
import { NetworkTopology } from "@/components/NetworkTopology";

const PacketAnalyzer: React.FC = () => {
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterOptions, setFilterOptions] = useState<PacketFilterOptions>({
    count: 20,
    interface: "eth0",
    filter: "",
  });
  const [statistics, setStatistics] = useState<PacketStatistics>({
    totalPackets: 0,
    protocolDistribution: {},
    typeDistribution: {},
    directionDistribution: {},
    averagePacketSize: 0,
  });
  const { toast } = useToast();

  // Fetch packets on component mount and when filter options change
  useEffect(() => {
    fetchPackets();
  }, []);

  // Calculate statistics when packets change
  useEffect(() => {
    calculateStatistics();
  }, [packets]);

  const fetchPackets = async () => {
    setLoading(true);
    try {
      const data = await fetchCapturedPackets(filterOptions);
      setPackets(data);
      toast({
        title: "Packets Captured",
        description: `Successfully captured ${data.length} packets`,
      });
    } catch (error) {
      console.error("Error fetching packets:", error);
      toast({
        title: "Error",
        description: "Failed to capture packets. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    if (!packets.length) return;

    const protocolDist: Record<string, number> = {};
    const typeDist: Record<string, number> = {};
    const directionDist: Record<string, number> = {};
    let totalSize = 0;

    packets.forEach((packet) => {
      // Protocol distribution
      const protocol = packet.protocol.toUpperCase();
      protocolDist[protocol] = (protocolDist[protocol] || 0) + 1;

      // Type distribution
      typeDist[packet.type] = (typeDist[packet.type] || 0) + 1;

      // Direction distribution
      directionDist[packet.direction] = (directionDist[packet.direction] || 0) + 1;

      // Total size
      totalSize += packet.length;
    });

    setStatistics({
      totalPackets: packets.length,
      protocolDistribution: protocolDist,
      typeDistribution: typeDist,
      directionDistribution: directionDist,
      averagePacketSize: Math.round(totalSize / packets.length),
    });
  };

  const handleFilterChange = (key: keyof PacketFilterOptions, value: string | number) => {
    setFilterOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Chart data for protocol distribution
  const protocolChartData = {
    labels: Object.keys(statistics.protocolDistribution),
    datasets: [
      {
        data: Object.values(statistics.protocolDistribution),
        backgroundColor: [
          "#3b82f6", // blue
          "#22c55e", // green
          "#eab308", // yellow
          "#a855f7", // purple
          "#ef4444", // red
          "#f97316", // orange
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for direction distribution
  const directionChartData = {
    labels: Object.keys(statistics.directionDistribution),
    datasets: [
      {
        data: Object.values(statistics.directionDistribution),
        backgroundColor: ["#ef4444", "#3b82f6", "#9ca3af"],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for packet types
  const typeChartData = {
    labels: Object.keys(statistics.typeDistribution),
    datasets: [
      {
        label: "Packet Types",
        data: Object.values(statistics.typeDistribution),
        backgroundColor: "#3b82f6",
      },
    ],
  };

  // Export packets as JSON
  const exportPackets = () => {
    const dataStr = JSON.stringify(packets, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `packet-capture-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar size={24} className="text-blue-400" />
            Network Packet Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Interface</label>
              <Select
                value={filterOptions.interface}
                onValueChange={(value) => handleFilterChange("interface", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eth0">eth0</SelectItem>
                  <SelectItem value="wlan0">wlan0</SelectItem>
                  <SelectItem value="br-lan">br-lan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Packet Count</label>
              <Select
                value={filterOptions.count.toString()}
                onValueChange={(value) => handleFilterChange("count", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 packets</SelectItem>
                  <SelectItem value="20">20 packets</SelectItem>
                  <SelectItem value="50">50 packets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[300px]">
              <label className="text-sm font-medium mb-1 block">Filter Expression</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., port 80 or host 8.8.8.8"
                  value={filterOptions.filter}
                  onChange={(e) => handleFilterChange("filter", e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-end">
              <Button onClick={fetchPackets} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Capture
              </Button>
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" onClick={exportPackets} disabled={!packets.length}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <Tabs defaultValue="packets">
            <TabsList className="mb-4">
              <TabsTrigger value="packets">Packets</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="topology">Network Topology</TabsTrigger>
            </TabsList>
            
            <TabsContent value="packets">
              {packets.length > 0 ? (
                <PacketAnalyzerTable packets={packets} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No packets captured. Click the Capture button to start.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="statistics">
              {packets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Protocol Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                      <Doughnut 
                        data={protocolChartData} 
                        options={{ 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right',
                            }
                          }
                        }} 
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Traffic Direction</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                      <Doughnut 
                        data={directionChartData} 
                        options={{ 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right',
                            }
                          }
                        }} 
                      />
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Packet Types</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <Bar 
                        data={typeChartData} 
                        options={{ 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            }
                          }
                        }} 
                      />
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted rounded-lg p-4">
                          <div className="text-sm font-medium text-muted-foreground">Total Packets</div>
                          <div className="text-2xl font-bold">{statistics.totalPackets}</div>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="text-sm font-medium text-muted-foreground">Avg. Packet Size</div>
                          <div className="text-2xl font-bold">{statistics.averagePacketSize} bytes</div>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="text-sm font-medium text-muted-foreground">Protocols</div>
                          <div className="text-2xl font-bold">{Object.keys(statistics.protocolDistribution).length}</div>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="text-sm font-medium text-muted-foreground">Packet Types</div>
                          <div className="text-2xl font-bold">{Object.keys(statistics.typeDistribution).length}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No statistics available. Capture packets first.
                </div>
              )}
            </TabsContent>
            <TabsContent value="topology">
              {packets.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Network Communication Map</CardTitle>
                    <CardDescription>
                      Visual representation of network traffic between hosts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <NetworkTopology packets={packets} />
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No topology data available. Capture packets first.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Advanced Analysis Card */}
      {packets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Network Analysis</CardTitle>
            <CardDescription>
              Insights derived from captured packet data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-medium mb-2">Traffic Patterns</h3>
                  <p className="text-sm text-muted-foreground">
                    {Object.entries(statistics.directionDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] === "outbound" 
                      ? "Predominantly outbound traffic suggests client activity."
                      : "Predominantly inbound traffic suggests server activity."}
                  </p>
                </div>
                
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-medium mb-2">Protocol Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    {Object.entries(statistics.protocolDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] === "TCP" 
                      ? "TCP dominance indicates connection-oriented applications."
                      : Object.entries(statistics.protocolDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] === "UDP"
                        ? "UDP dominance suggests real-time or streaming applications."
                        : "Mixed protocol usage indicates diverse network activity."}
                  </p>
                </div>
                
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-medium mb-2">Network Health</h3>
                  <p className="text-sm text-muted-foreground">
                    {statistics.averagePacketSize > 1000 
                      ? "Large average packet size suggests file transfers or streaming."
                      : statistics.averagePacketSize < 100
                        ? "Small average packet size suggests control traffic or interactive sessions."
                        : "Medium packet sizes indicate typical web browsing or mixed usage."}
                  </p>
                </div>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium mb-2">Security Insights</h3>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {packets.some(p => p.dst_port === 22 || p.src_port === 22) && (
                    <li>SSH traffic detected - ensure this is authorized access.</li>
                  )}
                  {packets.some(p => p.protocol.toLowerCase() === "icmp" && p.type.includes("Ping")) && (
                    <li>ICMP ping activity detected - could indicate network scanning.</li>
                  )}
                  {packets.filter(p => p.protocol.toLowerCase() === "tcp" && p.flags.includes("[S]") && !p.flags.includes("[S.]")).length > 5 && (
                    <li>Multiple TCP SYN packets without responses - possible port scanning activity.</li>
                  )}
                  {packets.some(p => [20, 21, 23, 25, 110, 143].includes(p.dst_port || 0)) && (
                    <li>Unencrypted protocol usage detected - consider using secure alternatives.</li>
                  )}
                </ul>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium mb-2">Performance Recommendations</h3>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {Object.entries(statistics.typeDistribution).some(([type, count]) => 
                    type.includes("DNS") && count > packets.length * 0.2) && (
                    <li>High DNS traffic detected - consider implementing DNS caching.</li>
                  )}
                  {statistics.averagePacketSize < 200 && packets.length > 10 && (
                    <li>Small packet sizes with high frequency - consider packet coalescing for efficiency.</li>
                  )}
                  {packets.filter(p => p.protocol.toLowerCase() === "tcp").length > packets.length * 0.8 && (
                    <li>TCP-heavy traffic - ensure TCP window scaling is enabled for better throughput.</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PacketAnalyzer;

