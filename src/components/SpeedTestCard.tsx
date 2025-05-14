import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Play, RefreshCw, History } from "lucide-react";
import { runSpeedTest, SpeedTestResult } from '../lib/speed-test-api';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils"; // Utility for classNames

export function SpeedTestCard() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SpeedTestResult[]>([]); // Store past results
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleRunTest = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const data = await runSpeedTest();
      setResult(data);
      setHistory((prev) => [data, ...prev.slice(0, 4)]); // Store up to 5 recent results
    } catch (err) {
      console.error('Speed test failed:', err);
      setError('Failed to run speed test. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 50) return 'bg-green-500';
    if (speed >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'bg-green-500';
    if (latency < 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-semibold">
            <Activity className="mr-2 h-5 w-5 text-blue-500" /> Internet Speed Test
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
      <CardContent className="pt-4">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded-md text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Download Speed */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 text-center">
                  <div className="text-sm font-medium text-gray-600">Download</div>
                  <Progress
                    value={result ? Math.min(result.download, 100) : 0}
                    className={cn(
                      'h-3 transition-all duration-1000 ease-out',
                      result ? getSpeedColor(result.download) : 'bg-gray-200'
                    )}
                    aria-label={`Download speed: ${result ? result.download.toFixed(1) : 0} Mbps`}
                  />
                  <div className="text-sm font-semibold">
                    {result ? `${result.download.toFixed(1)} Mbps` : '0.0 Mbps'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Download speed in Mbps</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Upload Speed */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 text-center">
                  <div className="text-sm font-medium text-gray-600">Upload</div>
                  <Progress
                    value={result ? Math.min(result.upload, 100) : 0}
                    className={cn(
                      'h-3 transition-all duration-1000 ease-out',
                      result ? getSpeedColor(result.upload) : 'bg-gray-200'
                    )}
                    aria-label={`Upload speed: ${result ? result.upload.toFixed(1) : 0} Mbps`}
                  />
                  <div className="text-sm font-semibold">
                    {result ? `${result.upload.toFixed(1)} Mbps` : '0.0 Mbps'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Upload speed in Mbps</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Latency */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 text-center">
                  <div className="text-sm font-medium text-gray-600">Latency</div>
                  <Progress
                    value={result ? Math.min(100 - result.latency, 100) : 0}
                    className={cn(
                      'h-3 transition-all duration-1000 ease-out',
                      result ? getLatencyColor(result.latency) : 'bg-gray-200'
                    )}
                    aria-label={`Latency: ${result ? result.latency.toFixed(1) : 0} ms`}
                  />
                  <div className="text-sm font-semibold">
                    {result ? `${result.latency.toFixed(1)} ms` : '0.0 ms'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Network latency in milliseconds</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {result && `Last test: ${new Date(result.time).toLocaleString()}`}
          </div>
          <Button
            onClick={handleRunTest}
            disabled={isRunning}
            className={cn(
              'w-48 sm:w-56 mt-2 font-medium transition-transform duration-200',
              isRunning ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600 text-white'
            )}
            size="sm"
            aria-label={isRunning ? 'Running speed test' : 'Run speed test'}
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Speed Test
              </>
            )}
          </Button>
        </div>
      </CardContent>

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
                    {new Date(item.time).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    Download: {item.download.toFixed(1)} Mbps | Upload: {item.upload.toFixed(1)} Mbps | Latency: {item.latency.toFixed(1)} ms
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
