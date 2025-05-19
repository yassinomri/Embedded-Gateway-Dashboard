import React, { Suspense, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpDown, Network, Wifi, ArrowRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartData, Point } from 'chart.js';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

// Memoize chart components to prevent unnecessary re-renders
const MemoizedLine = memo(React.lazy(() => 
  import("react-chartjs-2").then((module) => ({ default: module.Line }))
));

// Skeleton for chart loading state
const ChartSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-24 mx-auto" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-4 w-32 mx-auto" />
  </div>
);

interface BandwidthUsageCardProps {
  className?: string;
  ethernetBandwidthChartData: ChartData<'line', (number | Point)[], unknown> | {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }>;
  };
  wifiBandwidthChartData: ChartData<'line', (number | Point)[], unknown> | {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }>;
  };
  eth0BandwidthHistory: Array<{
    time: string;
    uploadRate: number;
    downloadRate: number;
    interface: string;
  }>;
  wifiBandwidthHistory: Array<{
    time: string;
    uploadRate: number;
    downloadRate: number;
    interface: string;
  }>;
}

export function BandwidthUsageCard({
  className,
  ethernetBandwidthChartData,
  wifiBandwidthChartData,
  eth0BandwidthHistory,
  wifiBandwidthHistory
}: BandwidthUsageCardProps) {
  // eslint-disable-next-line no-empty-pattern
  const [] = React.useState(false);

  return (
    <Card className={cn("col-span-4 w-full max-w-6xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-semibold">
            <ArrowUpDown className="mr-2 h-5 w-5 text-blue-500" /> Bandwidth Usage
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ethernet Bandwidth Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center">
                <Network className="mr-2 h-4 w-4 text-blue-500" /> Ethernet Bandwidth
              </CardTitle>
              <CardDescription>
                {eth0BandwidthHistory.length > 0 ? (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Download: {(eth0BandwidthHistory[eth0BandwidthHistory.length - 1]?.downloadRate * 60).toFixed(2)} Mbpm</span>
                    <span>Upload: {(eth0BandwidthHistory[eth0BandwidthHistory.length - 1]?.uploadRate * 60).toFixed(2)} Mbpm</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">No data available</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <Suspense fallback={<ChartSkeleton />}>
                  {ethernetBandwidthChartData && ethernetBandwidthChartData.labels?.length > 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <MemoizedLine
                              data={ethernetBandwidthChartData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Mbpm',
                                      font: { size: 12 }
                                    },
                                    grid: { color: 'rgba(0,0,0,0.1)' }
                                  },
                                  x: {
                                    grid: { display: false }
                                  }
                                },
                                plugins: {
                                  tooltip: {
                                    enabled: true,
                                    callbacks: {
                                      label: (context) => `${context.dataset.label}: ${(context.parsed.y * 60).toFixed(2)} Mbpm`
                                    }
                                  },
                                  datalabels: { display: false },
                                  legend: {
                                    display: true,
                                    position: 'bottom',
                                    labels: { boxWidth: 12, padding: 8, font: { size: 12 } }
                                  }
                                }
                              }}
                              aria-label="Ethernet bandwidth usage chart"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Ethernet download and upload rates over time</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No Ethernet data available
                    </div>
                  )}
                </Suspense>
              </div>
            </CardContent>
          </Card>

          {/* WiFi Bandwidth Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center">
                <Wifi className="mr-2 h-4 w-4 text-blue-500" /> WiFi Bandwidth
              </CardTitle>
              <CardDescription>
                {wifiBandwidthHistory.length > 0 ? (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Download: {(wifiBandwidthHistory[wifiBandwidthHistory.length - 1]?.downloadRate * 60).toFixed(2)} Mbpm</span>
                    <span>Upload: {(wifiBandwidthHistory[wifiBandwidthHistory.length - 1]?.uploadRate * 60).toFixed(2)} Mbpm</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">No data available</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <Suspense fallback={<ChartSkeleton />}>
                  {wifiBandwidthChartData && wifiBandwidthChartData.labels?.length > 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <MemoizedLine
                              data={wifiBandwidthChartData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Mbpm',
                                      font: { size: 12 }
                                    },
                                    grid: { color: 'rgba(0,0,0,0.1)' }
                                  },
                                  x: {
                                    grid: { display: false }
                                  }
                                },
                                plugins: {
                                  tooltip: {
                                    enabled: true,
                                    callbacks: {
                                      label: (context) => `${context.dataset.label}: ${(context.parsed.y * 60).toFixed(2)} Mbpm`
                                    }
                                  },
                                  datalabels: { display: false },
                                  legend: {
                                    display: true,
                                    position: 'bottom',
                                    labels: { boxWidth: 12, padding: 8, font: { size: 12 } }
                                  }
                                }
                              }}
                              aria-label="WiFi bandwidth usage chart"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>WiFi download and upload rates over time</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No WiFi data available
                    </div>
                  )}
                </Suspense>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

