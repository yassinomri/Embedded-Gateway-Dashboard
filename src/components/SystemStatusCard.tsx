import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, ArrowRight, MemoryStick, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from 'react';
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Memoize chart components to prevent unnecessary re-renders
const MemoizedDoughnut = memo(React.lazy(() => 
  import("react-chartjs-2").then((module) => ({ default: module.Doughnut }))
));

// Enhanced ChartSkeleton component
const ChartSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-32 w-32 mx-auto rounded-full" />
    <Skeleton className="h-4 w-24 mx-auto" />
  </div>
);

interface SystemStatusCardProps {
  className?: string;
  memoryChartData: {
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
    }>;
    labels: string[];
  };
  cpuChartData: {
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
    }>;
    labels: string[];
  };
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  cpuUsageData: { usage: number };
  loadAverage: string;
  formatMemory: (value: number) => string;
}

export function SystemStatusCard({ 
  className,
  memoryChartData,
  cpuChartData,
  totalMemory,
  freeMemory,
  usedMemory,
  cpuUsageData,
  loadAverage,
  formatMemory
}: SystemStatusCardProps) {

  return (
    <Card className={cn("flex flex-col w-full max-w-lg mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center space-x-2">
          <CardTitle className="flex items-center text-lg font-semibold">
            <Server className="mr-2 h-5 w-5 text-blue-500" /> System Status
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-8 pb-4 flex-grow flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Memory Usage Chart */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2">
                  <Suspense fallback={<ChartSkeleton />}>
                    <MemoizedDoughnut 
                      data={memoryChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                              boxWidth: 12,
                              padding: 8,
                              font: { size: 12 }
                            }
                          },
                          tooltip: {
                            enabled: true,
                            callbacks: {
                              label: (context) => `${context.label}: ${context.raw}%`
                            }
                          }
                        }
                      }}
                      aria-label="Memory usage chart"
                    />
                  </Suspense>
                  <p className="text-center text-sm font-medium text-gray-600">Memory Usage %</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Percentage of memory currently in use</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* CPU Usage Chart */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2">
                  <Suspense fallback={<ChartSkeleton />}>
                    <MemoizedDoughnut 
                      data={cpuChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                              boxWidth: 12,
                              padding: 8,
                              font: { size: 12 }
                            }
                          },
                          tooltip: {
                            enabled: true,
                            callbacks: {
                              label: (context) => `${context.label}: ${context.raw}%`
                            }
                          }
                        }
                      }}
                      aria-label="CPU usage chart"
                    />
                  </Suspense>
                  <p className="text-center text-sm font-medium text-gray-600">CPU Usage %</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Percentage of CPU currently in use</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Additional System Info */}
        <div className="mt-6 space-y-3 pt-10">
          <div className="grid grid-cols-1 gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <MemoryStick className="mr-2 h-4 w-4" /> Total Memory
                    </span>
                    <span className="text-sm font-semibold">{formatMemory(totalMemory)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Total system memory available</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <MemoryStick className="mr-2 h-4 w-4" /> Free Memory
                    </span>
                    <span className="text-sm font-semibold">{formatMemory(freeMemory)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Available memory not in use</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <MemoryStick className="mr-2 h-4 w-4" /> Used Memory
                    </span>
                    <span className="text-sm font-semibold">{formatMemory(usedMemory)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Memory currently in use</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <Cpu className="mr-2 h-4 w-4" /> CPU Usage
                    </span>
                    <span className="text-sm font-semibold">{cpuUsageData.usage}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Current CPU usage percentage</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <Cpu className="mr-2 h-4 w-4" /> Load Average
                    </span>
                    <span className="text-sm font-semibold">{loadAverage}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>System load average over time</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}