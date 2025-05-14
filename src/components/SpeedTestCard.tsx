import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw } from "lucide-react";
import { runSpeedTest, SpeedTestResult } from '../lib/speed-test-api';
import { Progress } from './ui/progress';

export function SpeedTestCard() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTest = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const data = await runSpeedTest();
      setResult(data);
    } catch (err) {
      console.error('Speed test failed:', err);
      setError('Failed to run speed test. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  // Helper function to determine progress color based on speed
  const getSpeedColor = (speed: number) => {
    if (speed >= 50) return 'bg-green-500';
    if (speed >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Activity className="mr-2 h-4 w-4" /> Internet Speed
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <div className="text-red-500 text-sm mb-2">{error}</div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          {/* Download Speed */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Download</span>
              <span className="text-sm font-medium">
                {result ? `${result.download.toFixed(1)} Mbps` : '-'}
              </span>
            </div>
            {result && (
              <Progress 
                value={Math.min(result.download, 100)} 
                className={`h-2 ${getSpeedColor(result.download)}`}
              />
            )}
          </div>
          
          {/* Upload Speed */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Upload</span>
              <span className="text-sm font-medium">
                {result ? `${result.upload.toFixed(1)} Mbps` : '-'}
              </span>
            </div>
            {result && (
              <Progress 
                value={Math.min(result.upload, 100)} 
                className={`h-2 ${getSpeedColor(result.upload)}`}
              />
            )}
          </div>
        </div>
        
        {/* Latency */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Latency</span>
            <span className="text-sm font-medium">
              {result ? `${result.latency.toFixed(1)} ms` : '-'}
            </span>
          </div>
          {result && (
            <Progress 
              value={Math.min(100 - result.latency, 100)} 
              className={`h-2 ${result.latency < 50 ? 'bg-green-500' : result.latency < 100 ? 'bg-yellow-500' : 'bg-red-500'}`}
            />
          )}
        </div>
        
        {/* Last Test Time */}
        {result && (
          <div className="mt-2 text-xs text-gray-500">
            Last test: {new Date(result.time).toLocaleString()}
          </div>
        )}
        
        {/* Run Test Button */}
        <Button
          onClick={handleRunTest}
          disabled={isRunning}
          className="w-full mt-3"
          size="sm"
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <Activity className="mr-2 h-4 w-4" />
              Run Speed Test
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}



