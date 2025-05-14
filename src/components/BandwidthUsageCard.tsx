import React, { Suspense, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpDown, Network, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartData, Point } from 'chart.js';

// Memoize chart components to prevent unnecessary re-renders
const MemoizedLine = memo(React.lazy(() => 
  import("react-chartjs-2").then((module) => ({ default: module.Line }))
));

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
  return (
    <Card className={cn("col-span-4", className)}>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <ArrowUpDown className="mr-2 h-5 w-5" /> Download/Upload rates in Mbps
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ethernet Bandwidth Card */}
          <Card className="shadow-md"> 
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Network className="mr-2 h-5 w-5" /> Ethernet Bandwidth
              </CardTitle>
              <CardDescription>
                {eth0BandwidthHistory.length > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span>Download: {eth0BandwidthHistory[eth0BandwidthHistory.length - 1]?.downloadRate.toFixed(2)} Mbps</span>
                    <span>Upload: {eth0BandwidthHistory[eth0BandwidthHistory.length - 1]?.uploadRate.toFixed(2)} Mbps</span>
                  </div>
                ) : (
                  <span>No data available</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <Suspense fallback={<div className="flex items-center justify-center h-full">Loading chart...</div>}>
                  {ethernetBandwidthChartData ? (
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
                              text: 'Mbps'
                            }
                          }
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Mbps`;
                              }
                            }
                          },
                          datalabels: {
                            display: false
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
                    </div>
                  )}
                </Suspense>
              </div>
            </CardContent>
          </Card>

          {/* WiFi Bandwidth Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Wifi className="mr-2 h-5 w-5" /> WiFi Bandwidth
              </CardTitle>
              <CardDescription>
                {wifiBandwidthHistory.length > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span>Download: {wifiBandwidthHistory[wifiBandwidthHistory.length - 1]?.downloadRate.toFixed(2)} Mbps</span>
                    <span>Upload: {wifiBandwidthHistory[wifiBandwidthHistory.length - 1]?.uploadRate.toFixed(2)} Mbps</span>
                  </div>
                ) : (
                  <span>No data available</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <Suspense fallback={<div className="flex items-center justify-center h-full">Loading chart...</div>}>
                  {wifiBandwidthChartData ? (
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
                              text: 'Mbps'
                            }
                          }
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Mbps`;
                              }
                            }
                          },
                          datalabels: {
                            display: false
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
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


