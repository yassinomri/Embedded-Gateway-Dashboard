import React, { useEffect, useState, useMemo, Suspense, memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/dashboard-api";
import { NetworkInterface } from "@/types/dashboard-data";
import { 
  RefreshCw, 
  WifiOff, 
  PowerIcon, 
  Network, 
  Wifi, 
  Smartphone 
} from "lucide-react";
import { SyncManager } from "@/components/SyncManager";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartData
} from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useQuery } from '@tanstack/react-query';
import { startStatusChecker, getGatewayStatus, subscribeToStatusChanges } from "@/lib/status-checker";
import { useNavigate, useLocation } from "react-router-dom";
import { debounce } from "lodash";
import { NetworkQualityCard } from "@/components/NetworkQualityCard";
import { SpeedTestCard } from "@/components/SpeedTestCard";
import { FirewallStatusCard } from "@/components/FirewallStatusCard";
import { SystemStatusCard } from "@/components/SystemStatusCard";
import { ArrowUpDown } from "lucide-react";
import { BandwidthUsageCard } from "@/components/BandwidthUsageCard";
import { ConnectedDevicesCard } from "@/components/ConnectedDevicesCard";
import { NetworkInterfacesCard } from "@/components/NetworkInterfacesCard";
import { AlertsCard, SecurityAlert } from "@/components/AlertsCard";
import { securityAlertsApi } from "@/lib/security-alerts-api";

// Memoize chart components to prevent unnecessary re-renders

const MemoizedLine = memo(React.lazy(() => 
  import("react-chartjs-2").then((module) => ({ default: module.Line }))
));

// Create lightweight skeleton components
const ChartSkeleton = () => (
  <div className="h-64 bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
    <span className="text-gray-400">Loading chart...</span>
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-3">
    <div className="h-8 bg-gray-100 animate-pulse rounded-md w-full"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-md w-full"></div>
    ))}
  </div>
);

// Add interface for bandwidth history by interface
interface InterfaceBandwidthHistory {
  time: string;
  uploadRate: number;
  downloadRate: number;
  interface: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Start the background status checker when Dashboard mounts
  useEffect(() => {
    startStatusChecker();
    // No need to stop it on unmount as we want it to keep running in the background
  }, []);

  // Replace the existing systemOnline state and useEffect with this
  const [systemOnline, setSystemOnline] = useState(false);

  // Subscribe to gateway status changes
  useEffect(() => {
    // Initial status
    const { online } = getGatewayStatus();
    setSystemOnline(online);
    
    // Subscribe to status changes - simplified to avoid navigation interference
    const unsubscribe = subscribeToStatusChanges((online) => {
      setSystemOnline(online);
      // No navigation code here - let React Router handle it
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Use React Query for data fetching with caching
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      try {
        console.log("Fetching dashboard data...");
        const response = await apiClient.getDashboardData();
        return response;
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        throw err;
      }
    },
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: 1, // Only retry once on failure
    refetchInterval: 60000, // Refetch every minute
    // Only fetch if system is online
    enabled: systemOnline,
  });

  // Replace the static alerts with data from the API
  const { 
    data: securityAlerts = [], 
    isLoading: alertsLoading,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ['securityAlerts'],
    queryFn: () => securityAlertsApi.getAlerts(10, false),
    staleTime: 60000, // Consider data fresh for 60 seconds
    enabled: systemOnline, // Only fetch if system is online
  });

  // Function to mark an alert as resolved
  const handleResolveAlert = async (id: string) => {
    try {
      await securityAlertsApi.resolveAlert(id);
      // Refetch alerts after resolving
      refetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  // Rest of your state variables
  const [, setHistoricalData] = useState([]);
  const [eth0BandwidthHistory, setEth0BandwidthHistory] = useState<InterfaceBandwidthHistory[]>([]);
  const [wifiBandwidthHistory, setWifiBandwidthHistory] = useState<InterfaceBandwidthHistory[]>([]);
  const [selectedInterfaces] = useState({
    ethernet: "eth0",
    wifi: "phy0-ap0"
  });
  
  // Add these state variables for the bandwidth charts
  const [ethernetBandwidthChartData, setEthernetBandwidthChartData] = useState<ChartData<'line'> | null>(null);
  const [wifiBandwidthChartData, setWifiBandwidthChartData] = useState<ChartData<'line'> | null>(null);  
  // Function to calculate bandwidth rates from bytes
  const calculateBandwidthRate = useCallback((bytesNow: number, bytesBefore: number, timeElapsedMs: number): number => {
    if (!bytesNow || !bytesBefore || !timeElapsedMs) return 0;
    // Convert bytes to bits and time to seconds, then to Mbps
    // We're keeping the same calculation but the display will show it as Mbpm
    return ((bytesNow - bytesBefore) * 8) / (timeElapsedMs / 1000) / 1000000;
  }, []);

  // Fetch bandwidth history only once on component mount
  const updateBandwidthHistory = useMemo(
    () =>
      debounce((interfaces, prevValues, selected) => {
        if (!interfaces || interfaces.length === 0) return;
        
        const now = Date.now();
        const eth0Interface = interfaces.find(iface => iface.name === selected.ethernet);
        const wifiInterface = interfaces.find(iface => iface.name === selected.wifi);
        
        // Process ethernet interface
        if (eth0Interface) {
          const rxBytes = parseInt(eth0Interface.rxBytes.replace(/[^0-9]/g, ''), 10);
          const txBytes = parseInt(eth0Interface.txBytes.replace(/[^0-9]/g, ''), 10);
          
          if (prevValues[selected.ethernet]) {
            const prev = prevValues[selected.ethernet];
            const timeElapsed = now - prev.timestamp;
            
            if (timeElapsed > 0) {
              const downloadRate = calculateBandwidthRate(rxBytes, prev.rxBytes, timeElapsed);
              const uploadRate = calculateBandwidthRate(txBytes, prev.txBytes, timeElapsed);
              
              // Only add new entry if rates are valid
              if (!isNaN(downloadRate) && !isNaN(uploadRate)) {
                const newEntry = {
                  time: new Date().toISOString(),
                  downloadRate,
                  uploadRate,
                  interface: selected.ethernet
                };
                
                setEth0BandwidthHistory(prev => {
                  const newHistory = [...prev, newEntry];
                  // Keep only the last 50 entries
                  return newHistory.slice(-50);
                });
              }
            }
          }
          
          // Update previous values
          setInterfacePrevValues(prev => ({
            ...prev,
            [selected.ethernet]: {
              rxBytes,
              txBytes,
              timestamp: now
            }
          }));
        }
        
        // Process WiFi interface
        if (wifiInterface) {
          const rxBytes = parseInt(wifiInterface.rxBytes.replace(/[^0-9]/g, ''), 10);
          const txBytes = parseInt(wifiInterface.txBytes.replace(/[^0-9]/g, ''), 10);
          
          if (prevValues[selected.wifi]) {
            const prev = prevValues[selected.wifi];
            const timeElapsed = now - prev.timestamp;
            
            if (timeElapsed > 0) {
              const downloadRate = calculateBandwidthRate(rxBytes, prev.rxBytes, timeElapsed);
              const uploadRate = calculateBandwidthRate(txBytes, prev.txBytes, timeElapsed);
              
              // Only add new entry if rates are valid
              if (!isNaN(downloadRate) && !isNaN(uploadRate)) {
                const newEntry = {
                  time: new Date().toISOString(),
                  downloadRate,
                  uploadRate,
                  interface: selected.wifi
                };
                
                setWifiBandwidthHistory(prev => {
                  const newHistory = [...prev, newEntry];
                  // Keep only the last 50 entries
                  return newHistory.slice(-50);
                });
              }
            }
          }
          
          // Update previous values
          setInterfacePrevValues(prev => ({
            ...prev,
            [selected.wifi]: {
              rxBytes,
              txBytes,
              timestamp: now
            }
          }));
        }
      }, 60000), // Change from 500 to 60000 for once per minute
    [calculateBandwidthRate]
  );

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
  const formatBytes = (bytes: string | number | undefined, decimals: number = 2): string => {
    if (!bytes) return "0 B";
    const value = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
    if (value === 0 || isNaN(value)) return "0 B";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(value) / Math.log(k));
    return `${parseFloat((value / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Function to format bandwidth values
  const formatBandwidth = (value: string | number | undefined): string => {
    if (!value) return "0 Kbps";
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numericValue)) return "0 Kbps";

    if (numericValue < 1) {
      return `${(numericValue * 1000).toFixed(2)} Kbps`;
    }
    return `${numericValue.toFixed(2)} Mbps`;
  };

  // Register Chart.js components
  ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ChartDataLabels
  );


  // Use useMemo for expensive calculations to prevent recalculations on re-renders
  const memoryInfo = useMemo(() => {
    if (!dashboardData?.memoryInfo) return {};
    
    // Use a more efficient parsing approach
    const result: Record<string, string> = {};
    const lines = dashboardData.memoryInfo.toString().split("\n");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        result[key] = value;
      }
    }
    
    return result;
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

  // Track previous values for interfaces to calculate rates
  const [interfacePrevValues, setInterfacePrevValues] = useState<{[key: string]: {rxBytes: number, txBytes: number, timestamp: number}}>({});
  
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
  
  // Update interface bandwidth history when network interfaces data changes
  useEffect(() => {
    updateBandwidthHistory(networkInterfaces, interfacePrevValues, selectedInterfaces);
  }, [networkInterfaces, interfacePrevValues, selectedInterfaces, updateBandwidthHistory]);

  // Ethernet bandwidth chart data
  useEffect(() => {
    if (eth0BandwidthHistory.length === 0) {
      setEthernetBandwidthChartData(null);
      return;
    }

    setEthernetBandwidthChartData({
      labels: eth0BandwidthHistory.map(entry => {
        const date = new Date(entry.time);
        return date.toLocaleTimeString();
      }),
      datasets: [
        {
          label: "Upload Rate (Mbps)",
          data: eth0BandwidthHistory.map(entry => entry.uploadRate),
          borderColor: "#FF6384",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true,
        },
        {
          label: "Download Rate (Mbps)",
          data: eth0BandwidthHistory.map(entry => entry.downloadRate),
          borderColor: "#36A2EB",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true,
        },
      ]
    });
  }, [eth0BandwidthHistory]);

  // WiFi bandwidth chart data
  useEffect(() => {
    if (wifiBandwidthHistory.length === 0) {
      setWifiBandwidthChartData(null);
      return;
    }

    setWifiBandwidthChartData({
      labels: wifiBandwidthHistory.map(entry => {
        const date = new Date(entry.time);
        return date.toLocaleTimeString();
      }),
      datasets: [
        {
          label: "Upload Rate (Mbps)",
          data: wifiBandwidthHistory.map(entry => entry.uploadRate),
          borderColor: "#FF6384",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true,
        },
        {
          label: "Download Rate (Mbps)",
          data: wifiBandwidthHistory.map(entry => entry.downloadRate),
          borderColor: "#36A2EB",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true,
        },
      ]
    });
  }, [wifiBandwidthHistory]);

  // Parse connected devices info
  const connectedDevices = useMemo(() => {
    if (!dashboardData?.connectedDevicesInfo?.devices) return [];
    return dashboardData.connectedDevicesInfo.devices;
  }, [dashboardData?.connectedDevicesInfo?.devices]);

  useEffect(() => {
    console.log("Connected Devices:", connectedDevices);
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




  if (isLoading) return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Skeleton loaders */}
        <div className="col-span-2"><ChartSkeleton /></div>
        <div className="col-span-2"><ChartSkeleton /></div>
        <div className="col-span-4"><ChartSkeleton /></div>
        <div className="col-span-4"><TableSkeleton /></div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SyncManager autoSync={true} />
      
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
        <button 
          onClick={() => refetch()} 
          className="refresh-button"
          aria-label="Refresh data"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
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
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
          {/* System Status - Left Side (2 columns wide) */}
          <SystemStatusCard 
            className="lg:col-span-2"
            memoryChartData={memoryChartData && {
              ...memoryChartData,
              datasets: memoryChartData.datasets.map(dataset => ({
                ...dataset,
                data: dataset.data.map(value => Number(value))
              }))
            }}
            cpuChartData={cpuChartData}
            totalMemory={totalMemory}
            freeMemory={freeMemory}
            usedMemory={usedMemory}
            cpuUsageData={{usage: Number(cpuUsageData.usage)}}
            loadAverage={loadAverage}
            formatMemory={formatMemory}
          />

          {/* Right Side Cards (2 columns wide) */}
          <div className="lg:col-span-2 flex flex-col gap-4 h-full">
            {/* Top Row: Firewall and Network Quality side by side - with increased height */}
            <div className="grid grid-cols-2 gap-4 flex-grow">
              <FirewallStatusCard className="h-full" />
              <NetworkQualityCard className="h-full" />
            </div>
            
            {/* Bottom Row: Speed Test Card full width */}
            <SpeedTestCard />
          </div>

          {/* Bandwidth Usage Section */}
          <BandwidthUsageCard 
            ethernetBandwidthChartData={ethernetBandwidthChartData || { labels: [], datasets: [] }}
            wifiBandwidthChartData={wifiBandwidthChartData || { labels: [], datasets: [] }}
            eth0BandwidthHistory={eth0BandwidthHistory}
            wifiBandwidthHistory={wifiBandwidthHistory}
          />

          {/* Connected Devices */}
          <ConnectedDevicesCard 
            connectedDevices={connectedDevices}
          />



                {/* Network Interfaces Section */}
          <NetworkInterfacesCard 
            networkInterfaces={networkInterfaces}
          />

          {/* Security Alerts */}
          <AlertsCard 
            alerts={securityAlerts}
            isLoading={alertsLoading}
            onResolve={handleResolveAlert}
          />

        </div>
      )}
    </div>
  );
};
