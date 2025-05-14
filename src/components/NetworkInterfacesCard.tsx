import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface NetworkInterface {
  name: string;
  mac: string;
  ipv4: string;
  ipv6: string;
  rxBytes: string;
  txBytes: string;
}

interface NetworkInterfacesCardProps {
  className?: string;
  networkInterfaces: NetworkInterface[];
  isLoading?: boolean; // Optional prop for loading state
}

export function NetworkInterfacesCard({
  className,
  networkInterfaces,
  isLoading = false
}: NetworkInterfacesCardProps) {
  return (
    <Card className={cn("col-span-4 w-full max-w-6xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center text-lg font-semibold">
          <Network className="mr-2 h-5 w-5 text-blue-500" /> Network Interfaces
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
        ) : networkInterfaces.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" role="grid" aria-label="Network interfaces table">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Interface</span>
                        </TooltipTrigger>
                        <TooltipContent>Network interface name</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>MAC Address</span>
                        </TooltipTrigger>
                        <TooltipContent>Interface MAC address</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>IPv4</span>
                        </TooltipTrigger>
                        <TooltipContent>IPv4 address assigned to the interface</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>IPv6</span>
                        </TooltipTrigger>
                        <TooltipContent>IPv6 address assigned to the interface</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>RX Bytes</span>
                        </TooltipTrigger>
                        <TooltipContent>Received data in Mbps</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>TX Bytes</span>
                        </TooltipTrigger>
                        <TooltipContent>Transmitted data in Mbps</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                </tr>
              </thead>
              <tbody>
                {networkInterfaces.map((iface, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "transition-colors duration-200 hover:bg-blue-50",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    )}
                    role="row"
                  >
                    <td className="px-4 py-3 border-t text-gray-700">{iface.name}</td>
                    <td className="px-4 py-3 border-t text-gray-700">{iface.mac}</td>
                    <td className="px-4 py-3 border-t text-gray-700">{iface.ipv4 || "N/A"}</td>
                    <td className="px-4 py-3 border-t text-gray-700">{iface.ipv6 || "N/A"}</td>
                    <td className="px-4 py-3 border-t text-gray-700">{iface.rxBytes}</td>
                    <td className="px-4 py-3 border-t text-gray-700">{iface.txBytes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Network className="h-8 w-8 mb-2" aria-hidden="true" />
            <p className="text-sm">No network interfaces found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}