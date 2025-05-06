import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/dashboard-api";
import { DashboardData } from "@/types/dashboard-data";
import { Doughnut, Line } from "react-chartjs-2"; // Import Line chart from react-chartjs-2
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale, // Import CategoryScale for x-axis labels
  LinearScale, // Import LinearScale for y-axis
  PointElement,
  LineElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale, // Register CategoryScale
  LinearScale, // Register LinearScale
  PointElement,
  LineElement
);

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getDashboardData()
      .then((data) => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch dashboard data.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading dashboard data...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!dashboardData) {
    return <p>No data available.</p>;
  }

  // Parse memory info
  const memoryInfo = dashboardData?.memoryInfo
    .split("\n")
    .reduce((acc: Record<string, string>, line) => {
      const [key, value] = line.split(":");
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});

  const totalMemory = parseInt(memoryInfo?.MemTotal || "0") / 1024; // Convert to MB
  const freeMemory = parseInt(memoryInfo?.MemFree || "0") / 1024; // Convert to MB
  const usedMemory = totalMemory - freeMemory; // Already in MB

  // Parse CPU usage from top info
  const cpuUsage = dashboardData?.topInfo
    .split("\n")
    .find((line) => line.includes("Cpu(s)"))
    ?.match(/(\d+\.\d+)\s*id/);
  const cpuUsagePercentage = cpuUsage ? (100 - parseFloat(cpuUsage[1])).toFixed(2) : "N/A";

  const loadAverage = dashboardData?.topInfo
    .split("\n")
    .find((line) => line.includes("load average"))
    ?.split(":")[1]
    ?.trim();

  // Chart data for memory usage
  const memoryChartData = {
    labels: ["Used", "Free"],
    datasets: [
      {
        data: [usedMemory, freeMemory],
        backgroundColor: ["#FF6384", "#36A2EB"],
        hoverBackgroundColor: ["#FF6384", "#36A2EB"],
      },
    ],
  };

  // Chart data for CPU usage
  const cpuChartData = {
    labels: ["Used", "Idle"],
    datasets: [
      {
        data: [cpuUsagePercentage, 100 - parseFloat(cpuUsagePercentage || "0")],
        backgroundColor: ["#FFCE56", "#4BC0C0"],
        hoverBackgroundColor: ["#FFCE56", "#4BC0C0"],
      },
    ],
  };

  // Parse bandwidth info (assuming it's a raw string with upload/download rates over time)
  const bandwidthLines = dashboardData?.bandwidthInfo.split("\n").filter((line) => line.trim() !== "");
  const uploadData: number[] = [];
  const downloadData: number[] = [];
  const labels: string[] = [];

  bandwidthLines?.forEach((line, index) => {
    const match = line.match(/Upload: (\d+\.?\d*) Mbps, Download: (\d+\.?\d*) Mbps/);
    if (match) {
      uploadData.push(parseFloat(match[1]));
      downloadData.push(parseFloat(match[2]));
      labels.push(`T-${index}`); // Example labels like T-0, T-1, T-2
    }
  });

  // Chart data for bandwidth usage
  const bandwidthChartData = {
    labels,
    datasets: [
      {
        label: "Upload (Mbps)",
        data: uploadData,
        borderColor: "#36A2EB",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        fill: true,
      },
      {
        label: "Download (Mbps)",
        data: downloadData,
        borderColor: "#FF6384",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
      },
    ],
  };

  // Parse connected devices info
  const connectedDevices = dashboardData?.connectedDevicesInfo
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [timestamp, mac, ip, hostname] = line.split(" ");
      return { timestamp, mac, ip, hostname };
    });

  // Parse firewall rules info
  const firewallRules = dashboardData?.firewallRulesInfo
  .split("\n")
  .reduce((acc: Record<string, unknown[]>, line) => {
    if (line.startsWith("Chain")) {
      // Extract chain name (e.g., "INPUT", "FORWARD", "OUTPUT")
      const chainName = line.split(" ")[1];
      acc[chainName] = [];
    } else if (line.trim() && !line.startsWith("pkts")) {
      // Parse rule details (if not a header line)
      const [pkts, bytes, target, proto, opt, inInterface, outInterface, source, destination] = line.split(/\s+/);
      const lastChain = Object.keys(acc).pop(); // Get the last chain added
      if (lastChain) {
        acc[lastChain].push({ pkts, bytes, target, proto, opt, inInterface, outInterface, source, destination });
      }
    }
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              {/* Memory Usage Chart */}
              <div className="w-1/2">
                <Doughnut data={memoryChartData} />
                <p className="text-center text-sm mt-2">Memory Usage</p>
              </div>

              {/* CPU Usage Chart */}
              <div className="w-1/2">
                <Doughnut data={cpuChartData} />
                <p className="text-center text-sm mt-2">CPU Usage</p>
              </div>
            </div>

            {/* Additional System Info */}
            <div className="mt-4 space-y-2">
              <p>
                <strong>Total Memory:</strong> {totalMemory.toFixed(2)} MB
              </p>
              <p>
                <strong>Free Memory:</strong> {freeMemory.toFixed(2)} MB
              </p>
              <p>
                <strong>Used Memory:</strong> {usedMemory.toFixed(2)} MB
              </p>
              <p>
                <strong>CPU Usage:</strong> {cpuUsagePercentage}%
              </p>
              <p>
                <strong>Load Average:</strong> {loadAverage || "N/A"}
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
            <Line data={bandwidthChartData} />
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
            <CardTitle>Firewall Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <span className="text-xl">🔥</span>
                <span className="text-lg font-bold">Firewall Status: </span>
                <span className="px-2 py-1 bg-green-500 text-white text-sm rounded">ACTIVE</span>
              </div>

              {/* Summary Info */}
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>{firewallRules ? Object.keys(firewallRules).length : 0}</strong> Rules Active
                </li>
                <li>
                  <strong>137</strong> Blocked Today {/* Replace with actual data if available */}
                </li>
                <li>
                  <strong>Top IPs:</strong> 192.168.1.22, 192.168.1.45 {/* Replace with actual data */}
                </li>
              </ul>

              {/* Last Alert */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">⚠️</span>
                  <span className="font-bold">Last Alert:</span>
                </div>
                <p>Port Scan</p>
                <p className="text-sm text-gray-500">2 mins ago</p> {/* Replace with actual data */}
              </div>

              {/* Go to Firewall Page Button */}
              <div className="mt-4">
                <button
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  onClick={() => {
                    // Navigate to the Firewall page
                    window.location.href = "/firewall";
                  }}
                >
                  Go to Firewall Page
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Connections */}
        <Card>
          <CardHeader>
            <CardTitle>Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">{dashboardData?.activeConnectionsInfo || "N/A"}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;