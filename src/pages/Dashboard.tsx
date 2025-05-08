import React, { useEffect, useState, useMemo, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Assuming you have a Button component
import { apiClient } from "@/lib/dashboard-api";
import { DashboardData } from "@/types/dashboard-data";
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
import { cpuUsage } from "process";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.getDashboardData();
        setDashboardData(response);
        localStorage.setItem("dashboardData", JSON.stringify(response));
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to fetch dashboard data.");
      } finally {
        setLoading(false); // Ensure loading is set to false
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    console.log("Dashboard Data:", dashboardData);
  }, [dashboardData]);

  const loadingContent = loading ? <p>Loading dashboard data...</p> : null;
  const errorContent = error ? <p className="text-red-500">{error}</p> : null;
  const noDataContent = !dashboardData ? <p>No data available.</p> : null;

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

  const totalMemory = parseInt(memoryInfo?.MemTotal || "0") / 1024; // Convert to MB
  const freeMemory = parseInt(memoryInfo?.MemFree || "0") / 1024; // Convert to MB
  const usedMemory = totalMemory - freeMemory; // Already in MB
  const usedMemoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);
  const freeMemoryPercentage = ((freeMemory / totalMemory) * 100).toFixed(2);

  // Parse CPU info
  const cpuUsageData = useMemo(() => {
    if (!dashboardData?.topInfo) {
      return { usage: "0", idlePercentage: 0, usedPercentage: 0 };
    }
    
    try {
      const topInfoString = dashboardData.topInfo.toString();
      
      // Look for the CPU line in BusyBox top format (matches the actual data)
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
  }, [dashboardData?.topInfo]);

  // Parse load average
  const loadAverage = useMemo(() => {
    if (!dashboardData?.topInfo) return "N/A";
    const loadLine = dashboardData.topInfo
      .toString()
      .split("\n")
      .find((line) => line.includes("load average"));
    return loadLine?.split(":")[1]?.trim() || "N/A";
  }, [dashboardData?.topInfo]);

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
    const { labels, uploadData, downloadData } = bandwidthData;
    
    if (labels.length === 0) return null;
    
    return {
      labels,
      datasets: [
        {
          label: "Upload (Mbps)",
          data: uploadData,
          borderColor: "#FF6384",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: false,
        },
        {
          label: "Download (Mbps)",
          data: downloadData,
          borderColor: "#36A2EB",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: false,
        },
      ],
    };
  }, [bandwidthData]);

  // Parse connected devices info
  const connectedDevices = useMemo(() => {
    if (!dashboardData?.connectedDevicesInfo) return [];
    
    return dashboardData.connectedDevicesInfo
      .toString()
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const [timestamp, mac, ip, hostname] = line.split(" ");
        return { timestamp, mac, ip, hostname };
      });
  }, [dashboardData?.connectedDevicesInfo]);

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

  if (loading) return loadingContent;
  if (error) return errorContent;
  if (!dashboardData) return noDataContent;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              {/* Memory Usage Chart */}
              <div className="w-1/2">
                <Suspense fallback={<p>Loading chart...</p>}>
                  {memoryChartData && <Doughnut 
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
                  />}
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
                <span className="text-lg ml-2 font-medium">{totalMemory.toFixed(2)} MB</span>
              </p>
              <p>
                <span className="text-base font-normal">Free Memory:</span>
                <span className="text-lg ml-2 font-medium">{freeMemory.toFixed(2)} MB</span>
              </p>
              <p>
                <span className="text-base font-normal">Used Memory:</span>
                <span className="text-lg ml-2 font-medium">{usedMemory.toFixed(2)} MB</span>
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

        {/* Bandwidth Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Bandwidth Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Bandwidth Rates */}
              <div className="flex justify-between items-center">
                <div>
                  <p>
                    <strong>Upload Rate:</strong> {dashboardData?.bandwidthInfo.txRate || "N/A"}
                  </p>
                  <p>
                    <strong>Download Rate:</strong> {dashboardData?.bandwidthInfo.rxRate || "N/A"}
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

        {/* Connected Devices */}
        <Card>
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

        {/* Firewall Status */}
        <Card>
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
                  <strong>{dashboardData?.firewallStatus?.rules?.activeRules || 0}</strong> Active Rules
                </li>
                <li>
                  <strong>{dashboardData?.firewallStatus?.rules?.totalRules || 0}</strong> Total Rules
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

        {/* Active Connections */}
        <Card className="col-span-6"> {/* Adjust grid span to give more space */}
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
    </div>
  );
};

export default Dashboard;