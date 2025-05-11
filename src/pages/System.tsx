import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../lib/system-api";
import { SystemInfo } from "../types/system-info";
import { Cpu, HardDrive, Clock, Server, Activity } from "lucide-react";
import "../styles/System.css";

const formatMemory = (value: number): string => {
  if (value < 1024) {
    return `${value} KB`; // Less than 1 MB
  } else if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} MB`; // Less than 1 GB
  } else {
    return `${(value / (1024 * 1024)).toFixed(2)} GB`; // 1 GB or more
  }
};

const System: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSystemInfo = () => {
    setRefreshing(true);
    apiClient
      .getSystemInfo()
      .then((data) => {
        setSystemInfo(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        setError("Failed to fetch system information.");
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchSystemInfo();
    
    // Refresh data every 30 seconds
    const intervalId = setInterval(fetchSystemInfo, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p className="font-medium">{error}</p>
        <button 
          onClick={fetchSystemInfo}
          className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate memory usage percentage
  const memoryUsagePercent = systemInfo && systemInfo.memoryTotal && systemInfo.memoryFree
    ? Math.round(((systemInfo.memoryTotal - systemInfo.memoryFree) / systemInfo.memoryTotal) * 100)
    : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">System Information</h1>
        <button 
          onClick={fetchSystemInfo}
          disabled={refreshing}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center gap-2">
            <Server className="h-5 w-5 text-blue-500" />
            <CardTitle>System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Version:</span>
              <span className="text-muted-foreground">{systemInfo?.version}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Hostname:</span>
              <span className="text-muted-foreground">{systemInfo?.hostname}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Date:</span>
              <span className="text-muted-foreground">{systemInfo?.Date}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <CardTitle>Uptime & Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Uptime:</span>
              <span className="text-muted-foreground">{systemInfo?.uptime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Load Average:</span>
              <span className="text-muted-foreground">{systemInfo?.loadAverage}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center gap-2">
            <Cpu className="h-5 w-5 text-green-500" />
            <CardTitle>CPU</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Model:</span>
              <span className="text-muted-foreground">{systemInfo?.cpuModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Cores:</span>
              <span className="text-muted-foreground">{systemInfo?.cpuCores}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center gap-2">
            <HardDrive className="h-5 w-5 text-purple-500" />
            <CardTitle>Memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Total Memory:</span>
              <span className="text-muted-foreground">
                {systemInfo?.memoryTotal ? formatMemory(systemInfo.memoryTotal) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Free Memory:</span>
              <span className="text-muted-foreground">
                {systemInfo?.memoryFree ? formatMemory(systemInfo.memoryFree) : "N/A"}
              </span>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Memory Usage:</span>
                <span className="text-muted-foreground">{memoryUsagePercent}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${memoryUsagePercent}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

  export default System;
