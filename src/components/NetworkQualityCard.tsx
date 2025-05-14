import React, { useState, useEffect } from 'react';
import { Network, Activity, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from '@tanstack/react-query';
import { getPerformance } from '@/lib/performance-api';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getTargetIp } from '@/lib/db';
import { Arrow } from '@radix-ui/react-tooltip';

interface NetworkQualityCardProps {
  className?: string;
}

export function NetworkQualityCard({ className }: NetworkQualityCardProps) {
  const navigate = useNavigate();
  const [currentTargetIp, setCurrentTargetIp] = useState<string | null>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ['networkQuality'],
    queryFn: getPerformance,
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
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center space-x-2">
          <CardTitle>
            <div className="flex items-center">
              <Network className="mr-2 h-5 w-5" /> Network Quality
            </div>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-4 flex-grow flex flex-col">
        {error ? (
          <div className="text-red-500 mb-4 text-base">
            Failed to load network metrics.
          </div>
        ) : (
          <div className="space-y-6 flex-grow flex flex-col">
            {/* Metrics Display */}
            <div className="space-y-6 flex-grow">
              {/* Latency */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs font-medium">Latency</span>
                  <span className="text-xs font-medium">
                    {data?.metrics?.latency?.toFixed(1) || '0'} ms
                  </span>
                </div>
                <Progress 
                  value={getProgressValue('latency', data?.metrics?.latency || 0)} 
                  className={`h-2 ${getQualityColor(getQualityLabel('latency', data?.metrics?.latency || 0))}`}
                />
                <div className="text-xs text-right">
                  {getQualityLabel('latency', data?.metrics?.latency || 0)}
                </div>
              </div>
              
              {/* Packet Loss */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs font-medium">Packet Loss</span>
                  <span className="text-xs font-medium">
                    {data?.metrics?.packetLoss?.toFixed(1) || '0'}%
                  </span>
                </div>
                <Progress 
                  value={getProgressValue('packetLoss', data?.metrics?.packetLoss || 0)} 
                  className={`h-2 ${getQualityColor(getQualityLabel('packetLoss', data?.metrics?.packetLoss || 0))}`}
                />
                <div className="text-xs text-right">
                  {getQualityLabel('packetLoss', data?.metrics?.packetLoss || 0)}
                </div>
              </div>
              
              {/* Throughput */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs font-medium">Throughput</span>
                  <span className="text-xs font-medium">
                    {data?.metrics?.throughput?.toFixed(1) || '0'} Mbps
                  </span>
                </div>
                <Progress 
                  value={getProgressValue('throughput', data?.metrics?.throughput || 0)} 
                  className={`h-2 ${getQualityColor(getQualityLabel('throughput', data?.metrics?.throughput || 0))}`}
                />
                <div className="text-xs text-right">
                  {getQualityLabel('throughput', data?.metrics?.throughput || 0)}
                </div>
              </div>
              
              {/* Latest Tested Target */}
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Latest tested target:</span> {currentTargetIp || 'Loading...'}
              </div>
            </div>
            
            {/* Run Network Test Button */}
            <Button 
              onClick={() => navigate('/performance')}
              className="w-full mt-auto hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300"
              size="sm"
              variant="outline"
            >
              Run Network Test
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}








