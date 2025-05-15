import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { apiClient } from "../lib/system-api";
import { SystemInfo } from "../types/system-info";
import { Cpu, HardDrive, Clock, Server, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const intervalId = setInterval(fetchSystemInfo, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-&48" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="shadow-lg">
              <CardHeader className="flex flex-row items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 border-red-500">
          <CardContent className="p-6 flex items-center space-x-4">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">{error}</p>
              <Button
                onClick={fetchSystemInfo}
                className="mt-4 bg-red-500 hover:bg-red-600"
                aria-label="Retry fetching system information"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memoryUsagePercent = systemInfo && systemInfo.memoryTotal && systemInfo.memoryFree
    ? Math.round(((systemInfo.memoryTotal - systemInfo.memoryFree) / systemInfo.memoryTotal) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
              <Server className="mr-2 h-6 w-6 text-blue-500" /> System Information
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={fetchSystemInfo}
                    disabled={refreshing}
                    className={cn(
                      "flex items-center",
                      refreshing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                    )}
                    aria-label="Refresh system information"
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh system information</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>Overview of system hardware and performance metrics</CardDescription>
        </CardHeader>
      </Card>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Card */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Server className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg font-semibold text-gray-800">System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Version:</span>
              <span className="text-sm text-gray-700">{systemInfo?.version || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Hostname:</span>
              <span className="text-sm text-gray-700">{systemInfo?.hostname || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">Date:</span>
              <span className="text-sm text-gray-700">{systemInfo?.Date || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Uptime & Load Card */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg font-semibold text-gray-800">Uptime & Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Uptime:</span>
              <span className="text-sm text-gray-700">{systemInfo?.uptime || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">Load Average:</span>
              <span className="text-sm text-gray-700">{systemInfo?.loadAverage || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* CPU Card */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Cpu className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg font-semibold text-gray-800">CPU</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Model:</span>
              <span className="text-sm text-gray-700">{systemInfo?.cpuModel || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">Cores:</span>
              <span className="text-sm text-gray-700">{systemInfo?.cpuCores || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Memory Card */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <HardDrive className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg font-semibold text-gray-800">Memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Total Memory:</span>
              <span className="text-sm text-gray-700">
                {systemInfo?.memoryTotal ? formatMemory(systemInfo.memoryTotal) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Free Memory:</span>
              <span className="text-sm text-gray-700">
                {systemInfo?.memoryFree ? formatMemory(systemInfo.memoryFree) : "N/A"}
              </span>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-600">Memory Usage:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-gray-700">{memoryUsagePercent}%</span>
                    </TooltipTrigger>
                    <TooltipContent>{memoryUsagePercent}% of total memory used</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${memoryUsagePercent}%` }}
                  role="progressbar"
                  aria-valuenow={memoryUsagePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
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