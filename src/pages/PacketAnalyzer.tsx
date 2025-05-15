import React, { useState, useEffect, useCallback } from "react";
import { fetchCapturedPackets, commonInterfaces, commonFilters } from "@/lib/packet-analyzer-api";
import { PacketData, PacketFilterOptions, PacketStatistics } from "@/types/packet-analyzer";
import { PacketAnalyzerTable } from "@/components/PacketAnalyzerTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter, Download, Radar, Network, Activity, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Doughnut, Bar } from "react-chartjs-2";
import { useToast } from "@/hooks/use-toast";
import { NetworkTopology } from "@/components/NetworkTopology";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

  const calculateStatistics = useCallback(() => {
    if (!packets.length) return;

    const protocolDist: Record<string, number> = {};
    const typeDist: Record<string, number> = {};
    const directionDist: Record<string, number> = {};
    let totalSize = 0;

    packets.forEach((packet) => {
      const protocol = packet.protocol.toUpperCase();
      protocolDist[protocol] = (protocolDist[protocol] || 0) + 1;
      typeDist[packet.type] = (typeDist[packet.type] || 0) + 1;
      directionDist[packet.direction] = (directionDist[packet.direction] || 0) + 1;
      totalSize += packet.length;
    });

    setStatistics({
      totalPackets: packets.length,
      protocolDistribution: protocolDist,
      typeDistribution: typeDist,
      directionDistribution: directionDist,
      averagePacketSize: Math.round(totalSize / packets.length),
    });
  }, [packets]);

  const fetchPackets = useCallback(async () => {
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
  }, [filterOptions, toast]);

  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  useEffect(() => {
    calculateStatistics();
  }, [calculateStatistics]);

  const handleFilterChange = (key: keyof PacketFilterOptions, value: string | number) => {
    setFilterOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const protocolChartData = {
    labels: Object.keys(statistics.protocolDistribution),
    datasets: [
      {
        data: Object.values(statistics.protocolDistribution),
        backgroundColor: ["#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ef4444", "#f97316"],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const directionChartData = {
    labels: Object.keys(statistics.directionDistribution),
    datasets: [
      {
        data: Object.values(statistics.directionDistribution),
        backgroundColor: ["#ef4444", "#3b82f6", "#9ca3af"],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const typeChartData = {
    labels: Object.keys(statistics.typeDistribution),
    datasets: [
      {
        label: "Packet Types",
        data: Object.values(statistics.typeDistribution),
        backgroundColor: "#3b82f6",
        borderColor: "#1e40af",
        borderWidth: 1,
      },
    ],
  };

  const exportPackets = () => {
    const dataStr = JSON.stringify(packets, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `packet-capture-${new Date().toISOString()}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
    toast({
      title: "Packets Exported",
      description: "Packet data has been exported as JSON.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
              <Radar className="mr-2 h-6 w-6 text-blue-500" />
              Network Packet Analyzer
            </CardTitle>
            <CardDescription>Real-time capture and analysis of network traffic</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-gray-600 mb-1 block">Interface</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Select
                        value={filterOptions.interface}
                        onValueChange={(value) => handleFilterChange("interface", value)}
                        disabled={loading}
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Select interface" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eth0">eth0</SelectItem>
                          <SelectItem value="wlan0">wlan0</SelectItem>
                          <SelectItem value="br-lan">br-lan</SelectItem>
                        </SelectContent>
                      </Select>
                    </TooltipTrigger>
                    <TooltipContent>Select network interface to capture packets</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-gray-600 mb-1 block">Packet Count</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Select
                        value={filterOptions.count.toString()}
                        onValueChange={(value) => handleFilterChange("count", parseInt(value))}
                        disabled={loading}
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Select count" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 packets</SelectItem>
                          <SelectItem value="20">20 packets</SelectItem>
                          <SelectItem value="50">50 packets</SelectItem>
                        </SelectContent>
                      </Select>
                    </TooltipTrigger>
                    <TooltipContent>Number of packets to capture</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex-1 min-w-[300px]">
                <label className="text-sm font-medium text-gray-600 mb-1 block">Filter Expression</label>
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          placeholder="e.g., port 80 or host 8.8.8.8"
                          value={filterOptions.filter}
                          onChange={(e) => handleFilterChange("filter", e.target.value)}
                          className="border-gray-300"
                          disabled={loading}
                          aria-label="Filter expression for packet capture"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Enter a filter expression (e.g., port or host)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={fetchPackets}
                          disabled={loading}
                          aria-label="Apply filter expression"
                        >
                          <Filter className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Apply filter expression</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex items-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={fetchPackets}
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600"
                        aria-label="Capture packets"
                      >
                        {loading ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Capture
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Capture packets with current filters</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={exportPackets}
                        disabled={!packets.length || loading}
                        aria-label="Export packets as JSON"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export captured packets as JSON</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="packets" className="space-y-4">
              <TabsList className="bg-gray-100 rounded-lg p-1">
                <TabsTrigger
                  value="packets"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  Packets
                </TabsTrigger>
                <TabsTrigger
                  value="statistics"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  Statistics
                </TabsTrigger>
                <TabsTrigger
                  value="topology"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  Network Topology
                </TabsTrigger>
              </TabsList>

              <TabsContent value="packets">
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-0">
                    {packets.length > 0 ? (
                      <PacketAnalyzerTable packets={packets} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <Radar className="h-8 w-8 mb-2" aria-hidden="true" />
                        <p>No packets captured. Click the Capture button to start.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statistics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        Protocol Distribution
                      </CardTitle>
                      <CardDescription>Breakdown of protocols in captured packets</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                      {packets.length > 0 ? (
                        <Doughnut
                          data={protocolChartData}
                          options={{
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: "right", labels: { font: { size: 12 } } },
                              tooltip: { backgroundColor: "#1f2937", bodyFont: { size: 12 } },
                            },
                          }}
                        />
                      ) : (
                        <div className="text-center text-gray-500">
                          No data available. Capture packets first.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        Traffic Direction
                      </CardTitle>
                      <CardDescription>Inbound vs. outbound traffic</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                      {packets.length > 0 ? (
                        <Doughnut
                          data={directionChartData}
                          options={{
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: "right", labels: { font: { size: 12 } } },
                              tooltip: { backgroundColor: "#1f2937", bodyFont: { size: 12 } },
                            },
                          }}
                        />
                      ) : (
                        <div className="text-center text-gray-500">
                          No data available. Capture packets first.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        Packet Types
                      </CardTitle>
                      <CardDescription>Distribution of packet types</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      {packets.length > 0 ? (
                        <Bar
                          data={typeChartData}
                          options={{
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: { backgroundColor: "#1f2937", bodyFont: { size: 12 } },
                            },
                            scales: {
                              x: { ticks: { font: { size: 12 } } },
                              y: { ticks: { font: { size: 12 } } },
                            },
                          }}
                        />
                      ) : (
                        <div className="text-center text-gray-500 h-full flex items-center justify-center">
                          No data available. Capture packets first.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        Summary
                      </CardTitle>
                      <CardDescription>Key metrics from captured packets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
                          <div className="text-sm font-medium text-gray-600">Total Packets</div>
                          <div className="text-2xl font-bold text-gray-800">{statistics.totalPackets}</div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
                          <div className="text-sm font-medium text-gray-600">Avg. Packet Size</div>
                          <div className="text-2xl font-bold text-gray-800">{statistics.averagePacketSize} bytes</div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
                          <div className="text-sm font-medium text-gray-600">Protocols</div>
                          <div className="text-2xl font-bold text-gray-800">{Object.keys(statistics.protocolDistribution).length}</div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
                          <div className="text-sm font-medium text-gray-600">Packet Types</div>
                          <div className="text-2xl font-bold text-gray-800">{Object.keys(statistics.typeDistribution).length}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="topology">
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      Network Communication Map
                    </CardTitle>
                    <CardDescription>Visual representation of network traffic between hosts</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {packets.length > 0 ? (
                      <NetworkTopology packets={packets} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Radar className="h-8 w-8 mb-2" aria-hidden="true" />
                        <p>No topology data available. Capture packets first.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Advanced Analysis */}
      {packets.length > 0 && !loading && (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <Network className="mr-2 h-5 w-5 text-blue-500" />
              Advanced Network Analysis
            </CardTitle>
            <CardDescription>Insights derived from captured packet data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <Network className="mr-1 h-4 w-4" />
                  Traffic Patterns
                </h3>
                <p className="text-sm text-gray-600">
                  {Object.entries(statistics.directionDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] === "outbound"
                    ? "Predominantly outbound traffic suggests client activity."
                    : "Predominantly inbound traffic suggests server activity."}
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <Filter className="mr-1 h-4 w-4" />
                  Protocol Analysis
                </h3>
                <p className="text-sm text-gray-600">
                  {Object.entries(statistics.protocolDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] === "TCP"
                    ? "TCP dominance indicates connection-oriented applications."
                    : Object.entries(statistics.protocolDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] === "UDP"
                      ? "UDP dominance suggests real-time or streaming applications."
                      : "Mixed protocol usage indicates diverse network activity."}
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <Radar className="mr-1 h-4 w-4" />
                  Network Health
                </h3>
                <p className="text-sm text-gray-600">
                  {statistics.averagePacketSize > 1000
                    ? "Large average packet size suggests file transfers or streaming."
                    : statistics.averagePacketSize < 100
                      ? "Small average packet size suggests control traffic or interactive sessions."
                      : "Medium packet sizes indicate typical web browsing or mixed usage."}
                </p>
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                <AlertCircle className="mr-1 h-4 w-4" />
                Security Insights
              </h3>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
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
                {packets.length > 0 && !packets.some(p => p.dst_port === 22 || p.src_port === 22 || p.protocol.toLowerCase() === "icmp" || [20, 21, 23, 25, 110, 143].includes(p.dst_port || 0)) && (
                  <li>No immediate security concerns detected in current packet data.</li>
                )}
              </ul>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition-colors duration-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                <Activity className="mr-1 h-4 w-4" />
                Performance Recommendations
              </h3>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
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
                {packets.length > 0 && !Object.entries(statistics.typeDistribution).some(([type, count]) =>
                  type.includes("DNS") && count > packets.length * 0.2) && statistics.averagePacketSize >= 200 && (
                  <li>Traffic patterns appear optimized - monitor for any anomalies.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PacketAnalyzer;
