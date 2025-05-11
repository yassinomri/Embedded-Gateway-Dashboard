import React, { useEffect, useState, useMemo, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Assuming you have a Button component
import { apiClient } from "@/lib/dashboard-api";
import { DashboardData, NetworkInterface } from "@/types/dashboard-data";
import { savePerformanceData, getHistoricalData, getBandwidthData, saveBandwidthData } from "@/lib/db";
import { PowerIcon, WifiOff } from "lucide-react";
import { SyncManager } from "@/components/SyncManager";

// Function to format memory values
const formatMemory = (value: number): string => {
  if (value < 1024) {
    return `${value} KB`; // Less than 1 MB
  } else if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} MB`; // Less than 1 GB
  } else {
    return `${(value / (1024 * 1024)).toFixed(2)} GB`; // 1 GB or more
  }
};

// Function to format bytes
const formatBytes = (bytes: string | number, decimals: number = 2): string => {
  if (!bytes) return "0 B";
  
  const value = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (value === 0) return "0 B";
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  
  const i = Math.floor(Math.log(value) / Math.log(k));
  
  return `${parseFloat((value / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Function to format bandwidth values
const formatBandwidth = (value: string | number): string => {
  if (!value) return "0 Kbps";

  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  if (numericValue < 1) {
    // Convert to Kbps if less than 1 Mbps
    return `${(numericValue * 1000).toFixed(2)} Kbps`;
  }

  // Keep in Mbps if 1 or greater
  return `${numericValue.toFixed(2)} Mbps`;
};

const Doughnut = React.lazy(() => import("react-chartjs-2").then((module) => ({ default: module.Doughnut })));
const Line = React.lazy(() => import("react-chartjs-2").then((module) => ({ default: module.Line })));
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<{ time: string; throughput: number }[]>([]);
  const [bandwidthHistory, setBandwidthHistory] = useState<
    { time: string; uploadRate: number; downloadRate: number }[]
  >([]);
  const [systemOnline, setSystemOnline] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.getDashboardData();
        setDashboardData(response);
        setSystemOnline(true);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to fetch dashboard data.");
        setSystemOnline(false);
        // No longer loading from cache
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    console.log("Dashboard Data:", dashboardData);
  }, [dashboardData]);

  useEffect(() => {
    console.log("Connected Devices Info:", dashboardData?.connectedDevicesInfo);
  }, [dashboardData?.connectedDevicesInfo]);

  useEffect(() => {
    const saveBandwidthData = async () => {
      if (dashboardData?.bandwidthInfo) {
        const txRate = parseFloat(dashboardData.bandwidthInfo.txRate || "0");
        const rxRate = parseFloat(dashboardData.bandwidthInfo.rxRate || "0");

        await savePerformanceData({
          latency: 0, // Placeholder if latency is not available
          packetLoss: 0, // Placeholder if packet loss is not available
          throughput: txRate + rxRate, // Total bandwidth (upload + download)
        });
      }
    };

    const interval = setInterval(saveBandwidthData, 5000); // Save every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [dashboardData?.bandwidthInfo]);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      const data = await getHistoricalData(50); // Fetch the last 50 entries
      setHistoricalData(data.map(entry => ({
        time: new Date(entry.time).toLocaleTimeString(), // Format time for the graph
        throughput: entry.throughput, // Total bandwidth
      })));
    };

    fetchHistoricalData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getHistoricalData(50);
      setHistoricalData(data.map(entry => ({
        time: new Date(entry.time).toLocaleTimeString(),
        throughput: entry.throughput,
      })));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  useEffect(() => {
    const saveBandwidth = async () => {
      if (dashboardData?.bandwidthInfo) {
        const uploadRate = parseFloat(dashboardData.bandwidthInfo.txRate || "0");
        const downloadRate = parseFloat(dashboardData.bandwidthInfo.rxRate || "0");

        await saveBandwidthData({ uploadRate, downloadRate });
      }
    };

    const interval = setInterval(saveBandwidth, 5000); // Save every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [dashboardData?.bandwidthInfo]);

  useEffect(() => {
    const fetchBandwidthHistory = async () => {
      const data = await getBandwidthData(50); // Fetch the last 50 entries
      setBandwidthHistory(
        data.map(entry => ({
          time: new Date(new Date(entry.time).getTime() + 60 * 60 * 1000).toLocaleTimeString(), // Add 1 hour
          uploadRate: entry.uploadRate,
          downloadRate: entry.downloadRate,
        }))
      );
    };

    fetchBandwidthHistory();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getBandwidthData(50);
      setBandwidthHistory(
        data.map(entry => ({
          time: new Date(new Date(entry.time).getTime() + 60 * 60 * 1000).toLocaleTimeString(), // Add 1 hour
          uploadRate: entry.uploadRate,
          downloadRate: entry.downloadRate,
        }))
      );
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);


  const loadingContent = loading ? <p>Loading dashboard data...</p> : null;
  const errorContent = error ? <p className="text-red-500">{error}</p> : null;

  // Parse memory info
  const memoryInfo = useMemo(() => {
    if (!dashboardData?.memoryInfo) return {};
    return dashboardData.memoryInfo
      .toString()
      .split("\n")
      .reduce((acc: Record<string, string>, line) => {
        const [key, value] = line.split(":");
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {});
  }, [dashboardData?.memoryInfo]);

  const totalMemory = parseInt(memoryInfo?.MemTotal || "0");
  const freeMemory = parseInt(memoryInfo?.MemFree);
  const usedMemory = totalMemory - freeMemory; 
  const usedMemoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);
  const freeMemoryPercentage = ((freeMemory / totalMemory) * 100).toFixed(2);

  // Parse CPU info
  const cpuUsageData = useMemo(() => {
    if (!dashboardData?.loadaverageInfo) {
      return { usage: "0", idlePercentage: 0, usedPercentage: 0 };
    }
    
    try {
      const topInfoString = dashboardData.loadaverageInfo.toString();
      
      // Expected format: "CPU:   0% usr   0% sys   0% nic 100% idle   0% io   0% irq   0% sirq"
      const cpuLine = topInfoString
        .split("\n")
        .find(line => line.startsWith("CPU:"));
        
      if (!cpuLine) {
        return { usage: "0", idlePercentage: 100, usedPercentage: 0 };
      }
      
      // Extract the idle percentage
      const idleMatch = cpuLine.match(/(\d+)% idle/);
      
      if (!idleMatch) {
        return { usage: "0", idlePercentage: 100, usedPercentage: 0 };
      }
      
      const idlePercentage = parseInt(idleMatch[1], 10);
      const usedPercentage = 100 - idlePercentage;
      
      return { 
        usage: usedPercentage.toString(),
        idlePercentage,
        usedPercentage
      };
    } catch (error) {
      console.error("Error parsing CPU data:", error);
      return { usage: "0", idlePercentage: 100, usedPercentage: 0 };
    }
  }, [dashboardData?.loadaverageInfo]);

  // Parse load average
  const loadAverage = useMemo(() => {
    if (!dashboardData?.loadaverageInfo) return "N/A";

    const loadValues = dashboardData.loadaverageInfo.split(" ");
    if (loadValues.length < 3) return "N/A";

    const oneMinute = loadValues[0];
    const fiveMinutes = loadValues[1];
    const fifteenMinutes = loadValues[2];

    return `${oneMinute} (1 min), ${fiveMinutes} (5 min), ${fifteenMinutes} (15 min)`;
  }, [dashboardData?.loadaverageInfo]);

  // Memory usage chart data
  const memoryChartData = useMemo(() => {
    if (!usedMemoryPercentage || !freeMemoryPercentage) return null;
    return {
      labels: ["Used", "Free"],
      datasets: [
        {
          data: [usedMemoryPercentage, freeMemoryPercentage],
          backgroundColor: ["#FF6384", "#36A2EB"],
          hoverBackgroundColor: ["#FF6384", "#36A2EB"],
        },
      ],
    };
  }, [usedMemoryPercentage, freeMemoryPercentage]);

  // CPU usage chart data
  const cpuChartData = useMemo(() => {
    const usedPercentage = cpuUsageData.usedPercentage;
    const idlePercentage = cpuUsageData.idlePercentage;
    
    return {
      labels: ["Used", "Idle"],
      datasets: [
        {
          data: [usedPercentage, idlePercentage],
          backgroundColor: ["#FF9F40", "#4BC0C0"],
          hoverBackgroundColor: ["#FF9F40", "#4BC0C0"],
          borderColor: ["#E67E22", "#2E8B57"],
          borderWidth: 1,
        },
      ],
    };
  }, [cpuUsageData]);

  // Parse bandwidth info
  const bandwidthData = useMemo(() => {
    if (!dashboardData?.bandwidthInfo) return { labels: [], uploadData: [], downloadData: [] };
    
    const bandwidthLines = dashboardData.bandwidthInfo
      .toString()
      .split("\n")
      .filter((line) => line.trim() !== "");
    
    const uploadData: number[] = [];
    const downloadData: number[] = [];
    const labels: string[] = [];

    bandwidthLines.forEach((line, index) => {
      const match = line.match(/Upload: (\d+\.?\d*) Mbps, Download: (\d+\.?\d*) Mbps/);
      if (match) {
        uploadData.push(parseFloat(match[1]));
        downloadData.push(parseFloat(match[2]));
        labels.push(`T-${index}`);
      }
    });

    return { labels, uploadData, downloadData };
  }, [dashboardData?.bandwidthInfo]);

  // Bandwidth chart data
  const bandwidthChartData = useMemo(() => {
    if (bandwidthHistory.length === 0) return null;

    return {
      labels: bandwidthHistory.map(entry => entry.time), // Time labels
      datasets: [
        {
          label: "Upload Rate (Mbps)",
          data: bandwidthHistory.map(entry => entry.uploadRate),
          borderColor: "#FF6384",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true,
        },
        {
          label: "Download Rate (Mbps)",
          data: bandwidthHistory.map(entry => entry.downloadRate),
          borderColor: "#36A2EB",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true,
        },
      ],
    };
  }, [bandwidthHistory]);

  // Parse connected devices info
  const connectedDevices = useMemo(() => {
    if (!dashboardData?.connectedDevicesInfo) return [];
  
    return dashboardData.connectedDevicesInfo
      .toString()
      .split(/\r?\n/) // Handle both \n and \r\n line separators
      .filter((line) => line.trim() !== "") // Remove empty lines
      .map((line) => {
        const parts = line.split(/\s+/); // Split by whitespace
        const timestamp = parts[0] || "N/A";
        const mac = parts[1] || "N/A";
        const ip = parts[2] || "N/A";
        const hostname = parts.slice(3).join(" ") || "N/A"; // Handle hostnames with spaces
        return { timestamp, mac, ip, hostname };
      });
  }, [dashboardData?.connectedDevicesInfo]);

  useEffect(() => {
    console.log("Parsed Connected Devices:", connectedDevices);
  }, [connectedDevices]);

  // Parse active connections info
  const activeConnections = useMemo(() => {
    if (!dashboardData?.activeConnectionsInfo) return [];

    return dashboardData.activeConnectionsInfo
      .toString()
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.startsWith("Proto")) // Skip headers or empty lines
      .map((line) => {
        const parts = line.split(/\s+/); // Split by whitespace
        return {
          protocol: parts[0],
          recvQ: parts[1],
          sendQ: parts[2],
          localAddress: parts[3],
          foreignAddress: parts[4],
          state: parts[5] || "N/A", // State might not always be present
        };
      });
  }, [dashboardData?.activeConnectionsInfo]);

  const networkInterfaces = useMemo(() => {
    if (!dashboardData?.networkInfo) return [];

    return Array.isArray(dashboardData.networkInfo) ? dashboardData.networkInfo.map((interfaceData: NetworkInterface) => ({
      name: interfaceData.interface || "N/A",
      mac: interfaceData.hwaddr || "N/A",
      ipv4: interfaceData.inet || "N/A",
      ipv6: interfaceData.inet6 || "N/A",
      rxBytes: formatBytes(interfaceData.rx_bytes) || "0",
      txBytes: formatBytes(interfaceData.tx_bytes) || "0",
      rxPackets: formatBytes(interfaceData.rx_packets) || "0",
      txPackets: formatBytes(interfaceData.tx_packets) || "0",
      mtu: interfaceData.mtu || "N/A",
    })) : [];
  }, [dashboardData?.networkInfo]);


  if (loading) return loadingContent;
  // Remove the error check that was showing the generic error message
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <SyncManager />
      
      {/* System Status Header - Always visible */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Gateway Status</h1>
          <PowerIcon 
            size={24} 
            className={systemOnline ? "text-green-500" : "text-red-500"} 
            fill={systemOnline ? "currentColor" : "none"}
          />
        </div>
      </div>

      {/* Show offline message when system is offline */}
      {!systemOnline ? (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="mb-6">
            {/* Placeholder for offline image */}
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <WifiOff size={48} className="text-gray-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Gateway is currently offline</h2>
          <p className="text-gray-500 text-center max-w-md mb-6">
            The gateway appears to be powered off or unreachable. Any configuration changes you make will be saved and applied when the gateway comes back online.
          </p>
        </div>
      ) : (
        /* Regular dashboard content when online */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* System Status */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CardTitle>System Status</CardTitle>
              </div>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                {/* Memory Usage Chart */}
                <div className="w-1/2">
                  <Suspense fallback={<div className="h-32 flex items-center justify-center">
                    <p>Loading Memory chart...</p>
                  </div>}>
                    <Doughnut 
                      data={memoryChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                              boxWidth: 12,
                              padding: 8
                            }
                          }
                        }
                      }}
                    />
                  </Suspense>
                  <p className="text-center text-sm mt-2">Memory Usage %</p>
                </div>

                {/* CPU Usage Chart */}
                <div className="w-1/2">
                  <Suspense fallback={<div className="h-32 flex items-center justify-center">
                    <p>Loading CPU chart...</p>
                  </div>}>
                    <Doughnut 
                      data={cpuChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                              boxWidth: 12,
                              padding: 8
                            }
                          }
                        }
                      }}
                    />
                  </Suspense>
                  <p className="text-center text-sm mt-2">CPU Usage %</p>
                </div>
              </div>

              {/* Additional System Info */}
              <div className="mt-8 space-y-2">
                <p>
                  <span className="text-base font-normal">Total Memory:</span>
                  <span className="text-lg ml-2 font-medium">{formatMemory(totalMemory)}</span>
                </p>
                <p>
                  <span className="text-base font-normal">Free Memory:</span>
                  <span className="text-lg ml-2 font-medium">{formatMemory(freeMemory)}</span>
                </p>
                <p>
                  <span className="text-base font-normal">Used Memory:</span>
                  <span className="text-lg ml-2 font-medium">{formatMemory(usedMemory)}</span>
                </p>
                <p>
                  <span className="text-base font-normal">CPU Usage:</span>
                  <span className="text-lg ml-2 font-medium">{cpuUsageData.usage}%</span>
                </p>
                <p>
                  <span className="text-base font-normal">Load Average:</span>
                  <span className="text-lg ml-2 font-medium">{loadAverage}</span>
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Firewall Status */}
          <Card className="col-span-2"> {/* Adjust grid span to give more space */}
            <CardHeader>
              <CardTitle>Firewall</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🔥</span>
                  <span className="text-lg font-bold">Status: </span>
                  <span
                    className={`px-2 py-1 text-white text-sm rounded ${
                      dashboardData?.firewallStatus?.status ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {dashboardData?.firewallStatus?.status ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Summary Info */}
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>{dashboardData?.firewallStatus?.activeRules || 0}</strong> Active Rules
                  </li>
                  <li>
                    <strong>{dashboardData?.firewallStatus?.totalRules || 0}</strong> Total Rules
                  </li>
                </ul>

                {/* Go to Firewall Page Button */}
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      window.location.href = "/firewall";
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Go to Firewall Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bandwidth Usage */}
          <Card className="col-span-4"> {/* Adjust grid span to give more space */}
            <CardHeader>
              <CardTitle>Bandwidth Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Bandwidth Rates */}
                <div className="flex justify-between items-center">
                  <div>
                    <p>
                      <strong>Upload Rate:</strong> {formatBandwidth(dashboardData?.bandwidthInfo.txRate || "0")}
                    </p>
                    <p>
                      <strong>Download Rate:</strong> {formatBandwidth(dashboardData?.bandwidthInfo.rxRate || "0")}
                    </p>
                  </div>
                </div>

                {/* Bandwidth Chart */}
                <Suspense fallback={<p>Loading chart...</p>}>
                  {bandwidthChartData && <Line data={bandwidthChartData} />}
                </Suspense>
              </div>
            </CardContent>
          </Card>



                {/* Network Interfaces Section */}
          <Card>
            <CardHeader>
              <CardTitle>Network Interfaces</CardTitle>
            </CardHeader>
            <CardContent>
              {networkInterfaces.length > 0 ? (
                <div className="overflow-y-auto max-h-96">
                  <table className="table-auto w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 border border-gray-300">Interface</th>
                        <th className="px-4 py-2 border border-gray-300">MAC Address</th>
                        <th className="px-4 py-2 border border-gray-300">IPv4</th>
                        <th className="px-4 py-2 border border-gray-300">IPv6</th>
                        <th className="px-4 py-2 border border-gray-300">RX Bytes</th>
                        <th className="px-4 py-2 border border-gray-300">TX Bytes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkInterfaces.map((iface, index) => (
                        <tr
                          key={index}
                          className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-4 py-2 border border-gray-300">{iface.name}</td>
                          <td className="px-4 py-2 border border-gray-300">{iface.mac}</td>
                          <td className="px-4 py-2 border border-gray-300">{iface.ipv4}</td>
                          <td className="px-4 py-2 border border-gray-300">{iface.ipv6}</td>
                          <td className="px-4 py-2 border border-gray-300">{iface.rxBytes}</td>
                          <td className="px-4 py-2 border border-gray-300">{iface.txBytes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No network interfaces found.</p>
              )}
            </CardContent>
          </Card>

          {/* Connected Devices */}
          <Card className="col-span-4"> {/* Adjust grid span to give more space */}
            <CardHeader>
              <CardTitle>Connected Devices</CardTitle>
            </CardHeader>
            <CardContent>
              {connectedDevices && connectedDevices.length > 0 ? (
                <table className="table-auto w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">IP Address</th>
                      <th className="px-4 py-2 text-left">MAC Address</th>
                      <th className="px-4 py-2 text-left">Hostname</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectedDevices.map((device, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{device.ip}</td>
                        <td className="px-4 py-2">{device.mac}</td>
                        <td className="px-4 py-2">{device.hostname || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No connected devices found.</p>
              )}
            </CardContent>
          </Card>



          {/* Active Connections */}
          <Card className="col-span-4"> {/* Adjust grid span to give more space */}
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
            </CardHeader>
            <CardContent>
              {activeConnections.length > 0 ? (
                <div className="overflow-y-auto max-h-96"> {/* Make the table scrollable */}
                  <table className="table-auto w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left border border-gray-300">Protocol</th>
                        <th className="px-4 py-2 text-left border border-gray-300">Recv-Q</th>
                        <th className="px-4 py-2 text-left border border-gray-300">Send-Q</th>
                        <th className="px-4 py-2 text-left border border-gray-300">Local Address</th>
                        <th className="px-4 py-2 text-left border border-gray-300">Foreign Address</th>
                        <th className="px-4 py-2 text-left border border-gray-300">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeConnections.map((connection, index) => (
                        <tr
                          key={index}
                          className={index % 2 === 0 ? "bg-white" : "bg-gray-50"} // Alternating row colors
                        >
                          <td className="px-4 py-2 border border-gray-300">{connection.protocol}</td>
                          <td className="px-4 py-2 border border-gray-300">{connection.recvQ}</td>
                          <td className="px-4 py-2 border border-gray-300">{connection.sendQ}</td>
                          <td className="px-4 py-2 border border-gray-300">{connection.localAddress}</td>
                          <td className="px-4 py-2 border border-gray-300">{connection.foreignAddress}</td>
                          <td className="px-4 py-2 border border-gray-300">{connection.state}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No active connections found.</p>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
};

export default Dashboard;





