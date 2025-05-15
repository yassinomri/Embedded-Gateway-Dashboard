import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, Wifi, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectedDevice {
  ip: string;
  mac: string;
  hostname: string;
  connectionType: string;
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

  return (
    <Card className={cn("col-span-4 w-full max-w-6xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center text-lg font-semibold">
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
                      "transition-colors duration-200 hover:bg-blue-50",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    )}
                    role="row"
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
    </Card>
  );
}