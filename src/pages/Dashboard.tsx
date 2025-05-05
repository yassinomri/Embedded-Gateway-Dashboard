import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { AlertTriangle, CheckCircle, Wifi, Activity, Cpu, Download, Upload } from "lucide-react";
import { apiClient } from "../lib/network-api";

interface DashboardStats {
  memoryUsage: { used: number; total: number };
  bandwidthUsage: { upload: number[]; download: number[] };
  connectedDevices: number;
  systemStatus: "stable" | "warning" | "critical";
  throughput: { upload: number; download: number };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "stable":
        return <CheckCircle className="text-green-500" />;
      case "warning":
        return <AlertTriangle className="text-yellow-500" />;
      case "critical":
        return <AlertTriangle className="text-red-500" />;
      default:
        return null;
    }
  };

  const memoryUsagePercentage = stats
    ? ((stats.memoryUsage.used / stats.memoryUsage.total) * 100).toFixed(1)
    : "0";

  const bandwidthChartData = {
    labels: Array.from({ length: stats?.bandwidthUsage.upload.length || 0 }, (_, i) => `${i + 1}s`),
    datasets: [
      {
        label: "Upload (Mbps)",
        data: stats?.bandwidthUsage.upload || [],
        borderColor: "#4caf50",
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        fill: true,
      },
      {
        label: "Download (Mbps)",
        data: stats?.bandwidthUsage.download || [],
        borderColor: "#2196f3",
        backgroundColor: "rgba(33, 150, 243, 0.2)",
        fill: true,
      },
    ],
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>

      {loading ? (
        <div className="text-center text-gray-600">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              {getStatusIcon(stats?.systemStatus || "stable")}
              <div>
                <p className="text-lg capitalize">{stats?.systemStatus}</p>
                <p className="text-sm text-gray-600">System is {stats?.systemStatus}</p>
              </div>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">
                {stats?.memoryUsage.used} MB / {stats?.memoryUsage.total} MB
              </p>
              <p className="text-sm text-gray-600">{memoryUsagePercentage}% used</p>
            </CardContent>
          </Card>

          {/* Connected Devices */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Devices</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Wifi className="text-blue-500" />
              <p className="text-lg">{stats?.connectedDevices} devices</p>
            </CardContent>
          </Card>

          {/* Bandwidth Usage */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Bandwidth Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <Line data={bandwidthChartData} />
            </CardContent>
          </Card>

          {/* Throughput */}
          <Card>
            <CardHeader>
              <CardTitle>Throughput</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Download className="text-green-500" />
                <p className="text-lg">{stats?.throughput.download} Mbps</p>
              </div>
              <div className="flex items-center gap-2">
                <Upload className="text-blue-500" />
                <p className="text-lg">{stats?.throughput.upload} Mbps</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;