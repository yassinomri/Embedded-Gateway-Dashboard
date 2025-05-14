import React, { useState, useEffect } from 'react';
import { Network, Activity, ArrowRight, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from '@tanstack/react-query';
import { getPerformance } from '@/lib/performance-api';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getTargetIp } from '@/lib/db';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface NetworkQualityCardProps {
  className?: string;
}

interface NetworkMetrics {
  latency: number;
  packetLoss: number;
  throughput: number;
  time?: string; // Optional timestamp for history
}

export function NetworkQualityCard({ className }: NetworkQualityCardProps) {
  const navigate = useNavigate();
  const [currentTargetIp, setCurrentTargetIp] = useState<string | null>(null);
  const [history, setHistory] = useState<NetworkMetrics[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ['networkQuality'],
    queryFn: async () => {
      const result = await getPerformance();
      // Add timestamp to result and store in history
      const timestampedResult = { ...result.metrics, time: new Date().toISOString() };
      setHistory((prev) => [timestampedResult, ...prev.slice(0, 4)]); // Store up to 5 recent results
      return result;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Load last tested IP from IndexedDB on mount
  useEffect(() => {
    const fetchTargetIp = async () => {
      const ip = await getTargetIp();
      setCurrentTargetIp(ip || '192.168.1.1'); // Default to gateway
    };
    fetchTargetIp();
  }, []);

  // Helper functions for quality metrics
  const getQualityLabel = (metric: string, value: number) => {
    switch (metric) {
      case 'latency':
        if (value < 20) return 'Excellent';
        if (value < 50) return 'Good';
        if (value < 100) return 'Fair';
        return 'Poor';
      case 'packetLoss':
        if (value < 0.5) return 'Excellent';
        if (value < 2) return 'Good';
        if (value < 5) return 'Fair';
        return 'Poor';
      case 'throughput':
        if (value > 50) return 'Excellent';
        if (value > 20) return 'Good';
        if (value > 5) return 'Fair';
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const getProgressValue = (metric: string, value: number) => {
    switch (metric) {
      case 'latency':
        return Math.max(0, 100 - (value / 2));
      case 'packetLoss':
        return Math.max(0, 100 - (value * 20));
      case 'throughput':
        return Math.min(100, value * 2);
      default:
        return 0;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Excellent': return 'bg-green-500';
      case 'Good': return 'bg-blue-500';
      case 'Fair': return 'bg-yellow-500';
      case 'Poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={cn("flex flex-col w-full max-w-lg mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-semibold">
            <Network className="mr-2 h-5 w-5 text-blue-500" /> Network Quality
          </CardTitle>
          {history.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHistoryOpen(true)}
                    aria-label="View test history"
                  >
                    <History className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Test History</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-4 flex-grow flex flex-col">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-2 rounded-md text-sm mb-4 text-center">
            Failed to load network metrics. Please try again.
          </div>
        ) : (
          <div className="space-y-6 flex-grow flex flex-col">
            {/* Metrics Display */}
            <div className="grid grid-cols-1 gap-4 flex-grow">
              {/* Latency */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Latency</span>
                        <span className="text-sm font-medium">
                          {data?.metrics?.latency?.toFixed(1) || '0'} ms
                        </span>
                      </div>
                      <Progress
                        value={getProgressValue('latency', data?.metrics?.latency || 0)}
                        className={cn(
                          'h-3 transition-all duration-1000 ease-out',
                          getQualityColor(getQualityLabel('latency', data?.metrics?.latency || 0))
                        )}
                        aria-label={`Latency: ${data?.metrics?.latency?.toFixed(1) || '0'} ms`}
                      />
                      <div className="text-sm text-right text-gray-500">
                        {getQualityLabel('latency', data?.metrics?.latency || 0)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Network latency in milliseconds</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Packet Loss */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Packet Loss</span>
                        <span className="text-sm font-medium">
                          {data?.metrics?.packetLoss?.toFixed(1) || '0'}%
                        </span>
                      </div>
                      <Progress
                        value={getProgressValue('packetLoss', data?.metrics?.packetLoss || 0)}
                        className={cn(
                          'h-3 transition-all duration-1000 ease-out',
                          getQualityColor(getQualityLabel('packetLoss', data?.metrics?.packetLoss || 0))
                        )}
                        aria-label={`Packet Loss: ${data?.metrics?.packetLoss?.toFixed(1) || '0'}%`}
                      />
                      <div className="text-sm text-right text-gray-500">
                        {getQualityLabel('packetLoss', data?.metrics?.packetLoss || 0)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Percentage of packets lost during transmission</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Throughput */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Throughput</span>
                        <span className="text-sm font-medium">
                          {data?.metrics?.throughput?.toFixed(1) || '0'} Mbps
                        </span>
                      </div>
                      <Progress
                        value={getProgressValue('throughput', data?.metrics?.throughput || 0)}
                        className={cn(
                          'h-3 transition-all duration-1000 ease-out',
                          getQualityColor(getQualityLabel('throughput', data?.metrics?.throughput || 0))
                        )}
                        aria-label={`Throughput: ${data?.metrics?.throughput?.toFixed(1) || '0'} Mbps`}
                      />
                      <div className="text-sm text-right text-gray-500">
                        {getQualityLabel('throughput', data?.metrics?.throughput || 0)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Data transfer rate in Mbps</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Latest Tested Target */}
              <div className="mt-2 text-sm text-gray-500">
                <span className="font-medium">Latest tested target:</span> {currentTargetIp || 'Loading...'}
              </div>
            </div>

            {/* Run Network Test Button */}
            <Button
              onClick={() => navigate('/performance')}
              className={cn(
                'w-full mt-4 font-medium transition-transform duration-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              size="sm"
              variant="outline"
              disabled={isLoading}
              aria-label="Navigate to network performance page"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Run Network Test
            </Button>
          </div>
        )}

        {/* History Modal */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test History</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-500">No test history available.</p>
              ) : (
                history.map((item, index) => (
                  <div key={index} className="border-b pb-2">
                    <p className="text-sm text-gray-600">
                      {item.time ? new Date(item.time).toLocaleString() : 'Unknown time'}
                    </p>
                    <p className="text-sm">
                      Latency: {item.latency.toFixed(1)} ms ({getQualityLabel('latency', item.latency)}) | 
                      Packet Loss: {item.packetLoss.toFixed(1)}% ({getQualityLabel('packetLoss', item.packetLoss)}) | 
                      Throughput: {item.throughput.toFixed(1)} Mbps ({getQualityLabel('throughput', item.throughput)})
                    </p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}