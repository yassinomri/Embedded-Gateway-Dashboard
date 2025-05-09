import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../lib/system-api";
import { SystemInfo } from "../types/system-info";

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
  
    useEffect(() => {
      apiClient
        .getSystemInfo()
        .then((data) => {
          setSystemInfo(data);
          setLoading(false);
        })
        .catch((err) => {
          setError("Failed to fetch system information.");
          setLoading(false);
        });
    }, []);
  
    if (loading) {
      return <p>Loading system information...</p>;
    }
  
    if (error) {
      return <p className="text-red-500">{error}</p>;
    }
  
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Version:</strong> {systemInfo?.version}
              </div>
              <div>
                <strong>Uptime:</strong> {systemInfo?.uptime}
              </div>
              <div>
                <strong>Date:</strong> {systemInfo?.Date}
              </div>
              <div>
                <strong>Hostname:</strong> {systemInfo?.hostname}
              </div>
              <div>
                <strong>CPU Model:</strong> {systemInfo?.cpuModel}
              </div>
              <div>
                <strong>CPU Cores:</strong> {systemInfo?.cpuCores}
              </div>
              <div>
                <strong>Total Memory:</strong> {systemInfo?.memoryTotal ? formatMemory(systemInfo.memoryTotal) : "N/A"}
              </div>
              <div>
                <strong>Free Memory:</strong> {systemInfo?.memoryFree ? formatMemory(systemInfo.memoryFree) : "N/A"}
              </div>
              <div>
                <strong>Load Average:</strong> {systemInfo?.loadAverage}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  export default System;