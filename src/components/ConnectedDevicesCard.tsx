import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Wifi, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDeviceInfo, disconnectDevice, limitBandwidth } from "@/lib/connectedDeviceApi";

interface ConnectedDevice {
  ip: string;
  mac: string;
  hostname: string;
  connectionType: string;
  downloadRate?: number; // Mbps
  uploadRate?: number;   // Mbps
}

interface ConnectedDevicesCardProps {
  className?: string;
  connectedDevices: ConnectedDevice[];
  isLoading?: boolean; // Optional prop for loading state
}

export function ConnectedDevicesCard({
  className,
  connectedDevices,
  isLoading = false
}: ConnectedDevicesCardProps) {
  // Helper to get connection type icon
  const getConnectionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-4 w-4 text-blue-500" aria-hidden="true" />;
      case 'ethernet':
        return <Network className="h-4 w-4 text-green-500" aria-hidden="true" />;
      default:
        return <Smartphone className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    }
  };

  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);
  const [limitValue, setLimitValue] = useState("");
  interface DeviceInfo {
    status: string;
    rx_bytes: number;
    tx_bytes: number;
    rx_packets: number;
    tx_packets: number;
    rx_bitrate: number;
    tx_bitrate: number;
    connected_time: string;
    authorized: boolean;
    associated: boolean;
  }

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const handleRowClick = async (device: ConnectedDevice) => {
    setSelectedDevice(device);
    setInfoLoading(true);
    try {
      const info = await getDeviceInfo(device.mac);
      setDeviceInfo(info);
    } catch {
      setDeviceInfo(null);
    }
    setInfoLoading(false);
  };

  const handleDisconnect = async () => {
    if (selectedDevice) await disconnectDevice(selectedDevice.mac);
    setSelectedDevice(null);
    setDeviceInfo(null);
  };

  const handleLimitBandwidth = async () => {
    if (selectedDevice && limitValue) await limitBandwidth(selectedDevice.mac, limitValue);
    setSelectedDevice(null);
    setDeviceInfo(null);
    setLimitValue("");
  };

  return (
    <Card className={cn("col-span-4 w-full max-w-6xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center text-lg font-semibold text-black">
          <Smartphone className="mr-2 h-5 w-5 text-blue-500" /> Connected Devices
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 pb-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : connectedDevices && connectedDevices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" role="grid" aria-label="Connected devices table">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>IP Address</span>
                        </TooltipTrigger>
                        <TooltipContent>Device IP address on the network</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>MAC Address</span>
                        </TooltipTrigger>
                        <TooltipContent>Device MAC address</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Hostname</span>
                        </TooltipTrigger>
                        <TooltipContent>Device hostname or identifier</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Type</span>
                        </TooltipTrigger>
                        <TooltipContent>Connection type (e.g., WiFi, Ethernet)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                </tr>
              </thead>
              <tbody>
                {connectedDevices.map((device, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "transition-colors duration-200 hover:bg-blue-50 cursor-pointer",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    )}
                    role="row"
                    onClick={() => handleRowClick(device)}
                  >
                    <td className="px-4 py-3 border-t text-gray-700">{device.ip}</td>
                    <td className="px-4 py-3 border-t text-gray-700">{device.mac}</td>
                    <td className="px-4 py-3 border-t text-gray-700">{device.hostname || "N/A"}</td>
                    <td className="px-4 py-3 border-t text-gray-700 flex items-center">
                      {getConnectionIcon(device.connectionType)}
                      <span className="ml-2">{device.connectionType}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Smartphone className="h-8 w-8 mb-2" aria-hidden="true" />
            <p className="text-sm">No connected devices found.</p>
          </div>
        )}
      </CardContent>
      {selectedDevice && (
        <Dialog open={!!selectedDevice} onOpenChange={() => { setSelectedDevice(null); setDeviceInfo(null); }}>
          <DialogContent
            className="max-w-lg animate-in fade-in-50 rounded-lg"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderColor: "rgba(0, 0, 0, 0.1)",
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-black">Manage Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm text-black">
                <div><strong>IP:</strong> {selectedDevice?.ip}</div>
                <div><strong>MAC:</strong> {selectedDevice?.mac}</div>
                <div className="col-span-2"><strong>Hostname:</strong> {selectedDevice?.hostname || "N/A"}</div>
              </div>
              {infoLoading ? (
                <div className="flex items-center justify-center text-gray-600">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-[#1DA2DA]"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z"
                    />
                  </svg>
                  Loading device info...
                </div>
              ) : deviceInfo && deviceInfo.status === "success" ? (
                <div className="grid grid-cols-2 gap-2 text-sm text-black">
                  <div><strong>RX Bytes:</strong> {deviceInfo.rx_bytes}</div>
                  <div><strong>TX Bytes:</strong> {deviceInfo.tx_bytes}</div>
                  <div><strong>RX Packets:</strong> {deviceInfo.rx_packets}</div>
                  <div><strong>TX Packets:</strong> {deviceInfo.tx_packets}</div>
                  <div><strong>RX Bitrate:</strong> {deviceInfo.rx_bitrate}</div>
                  <div><strong>TX Bitrate:</strong> {deviceInfo.tx_bitrate}</div>
                  <div className="col-span-2"><strong>Connected Time:</strong> {deviceInfo.connected_time}</div>
                  <div><strong>Authorized:</strong> {deviceInfo.authorized ? "Yes" : "No"}</div>
                  <div><strong>Associated:</strong> {deviceInfo.associated ? "Yes" : "No"}</div>
                </div>
              ) : (
                <div className="text-sm text-red-600">No device info available.</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="bandwidth-limit" className="text-black">
                  Set Bandwidth Limit (Mbps)
                </Label>
                <Input
                  id="bandwidth-limit"
                  type="number"
                  min="0"
                  value={limitValue}
                  onChange={e => setLimitValue(e.target.value)}
                  placeholder="e.g. 10"
                  className="border-gray-300 text-black focus:ring-2 focus:ring-[#1DA2DA] transition-all duration-200"
                  aria-label="Set bandwidth limit in Mbps"
                />
                <Button
                  className="w-full bg-[#1DA2DA] hover:bg-[#1890c0] text-white"
                  onClick={handleLimitBandwidth}
                  disabled={!limitValue}
                  aria-label="Apply bandwidth limit"
                >
                  Apply Limit
                </Button>
              </div>
              <Button
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDisconnect}
                aria-label="Disconnect device"
              >
                Disconnect Device
              </Button>
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                className="bg-[#1DA2DA] hover:bg-[#1890c0] text-white"
                onClick={() => { setSelectedDevice(null); setDeviceInfo(null); }}
                aria-label="Close dialog"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}