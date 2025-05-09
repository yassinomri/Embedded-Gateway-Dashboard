import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Activity,
  Clock,
  Wifi,
  Network,
  Play,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import {
  getPerformance,
  updatePerformance,
  PerformanceData,
  HistoryEntry,
} from '../lib/performance-api';
import { savePerformanceData, getHistoricalData, saveTargetIp, getTargetIp, clearOldData } from '../lib/db';
import { lazy, Suspense } from 'react';

const PerformanceChart = lazy(() =>
  import('@/styles/PerformanceChart').then((mod) => {
    console.log('Chart component preloaded');
    return mod;
  })
);

const EMPTY_DATA: PerformanceData = {
  metrics: { latency: 0, packetLoss: 0, throughput: 0 },
  history: [],
  qos: { enabled: false },
};

const MetricCardSkeleton = () => (
  <Card className="shadow-sm animate-pulse">
    <CardContent className="p-6 flex items-center space-x-4">
      <div className="w-10 h-10 bg-gray-200 rounded-full" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
      </div>
    </CardContent>
  </Card>
);

const Performance = () => {
  const [testForm, setTestForm] = useState({ targetIp: '8.8.8.8', duration: 30 });
  const [testing, setTesting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentTargetIp, setCurrentTargetIp] = useState<string | null>(null);
  const { toast } = useToast();

  // Load last tested IP from IndexedDB on mount
  useEffect(() => {
    const fetchTargetIp = async () => {
      const ip = await getTargetIp();
      setCurrentTargetIp(ip || '192.168.1.1'); // Default to gateway
    };
    fetchTargetIp();
  }, []);

  // Fetch live data with SWR
  const {
    data = EMPTY_DATA,
    error,
    isValidating,
    mutate,
  } = useSWR<PerformanceData>('performance-data', getPerformance, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
    dedupingInterval: 10000,
    focusThrottleInterval: 30000,
    errorRetryInterval: 5000,
    errorRetryCount: 3,
    loadingTimeout: 3000,
    onSuccess: async (res) => {
      await savePerformanceData(res.metrics);
    },
    onError: () =>
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load performance data',
      }),
  });

  // Fetch historical data from IndexedDB
  useEffect(() => {
    const fetchHistory = async () => {
      const historicalData = await getHistoricalData(50);
      setHistory(historicalData);
    };
    fetchHistory();
  }, [data.metrics]);

  // Clear old data daily
  useEffect(() => {
    const interval = setInterval(() => {
      clearOldData(7);
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestForm((prev) => ({
      ...prev,
      [name]: name === 'duration' ? Math.max(1, parseInt(value, 10) || 1) : value,
    }));
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const { targetIp, duration } = testForm;
    if (!targetIp || duration <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Valid target IP and duration are required',
      });
      return;
    }
    try {
      setTesting(true);
      await updatePerformance({ action: 'test', targetIp, duration });
      await saveTargetIp(targetIp); // Save to IndexedDB
      setCurrentTargetIp(targetIp); // Update label
      toast({ title: 'Success', description: 'Network test started' });
      mutate();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to run network test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleQoS = async () => {
    const newEnabled = !data.qos.enabled;
    try {
      await updatePerformance({ action: 'update', qosEnabled: newEnabled });
      toast({
        title: 'Success',
        description: `QoS ${newEnabled ? 'enabled' : 'disabled'} successfully`,
      });
      mutate();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to toggle QoS',
      });
    }
  };

  const isLoading = !data && !error;

  return (
    <div className="w-full px-4 py-6 bg-gray-50 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm gap-4">
        <div className="flex items-center gap-2">
          <Network size={24} className="text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Network Performance</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition"
          >
            <RefreshCw className={`${isValidating ? 'animate-spin' : ''} text-gray-600`} size={18} />
            Refresh
          </button>
          <button
            onClick={handleToggleQoS}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${
              data.qos.enabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Settings size={18} />
            QoS {data.qos.enabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Current Tested IP Label */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-gray-700">
          Current Tested IP: <span className="font-bold">{currentTargetIp || 'Loading...'}</span>
        </p>
      </div>

      {/* Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['latency', 'packetLoss', 'throughput'].map((metric) => {
          const colors = {
            latency: ['bg-blue-100', 'text-blue-600'],
            packetLoss: ['bg-amber-100', 'text-amber-600'],
            throughput: ['bg-green-100', 'text-green-600'],
          };
          const units = {
            latency: 'ms',
            packetLoss: '%',
            throughput: 'Mbps',
          };
          const icons = {
            latency: <Clock className={colors[metric][1]} size={24} />,
            packetLoss: <Activity className={colors[metric][1]} size={24} />,
            throughput: <Wifi className={colors[metric][1]} size={24} />,
          };
          return (
            <Card key={metric} className="shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className={`p-3 ${colors[metric][0]} rounded-full`}>{icons[metric]}</div>
                <div>
                  <p className="text-sm font-medium text-gray-500 capitalize">{metric}</p>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {isLoading ? '--' : data.metrics[metric as keyof typeof data.metrics]}
                    </h3>
                    <span className="text-sm text-gray-500">{units[metric]}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Historical Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Suspense fallback={<div className="h-full bg-gray-100 animate-pulse rounded-md" />}>
                <PerformanceChart history={history} />
              </Suspense>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Network Performance Test</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleRunTest}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target IP</label>
                <input
                  name="targetIp"
                  type="text"
                  value={testForm.targetIp}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="8.8.8.8"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Duration <span className="text-gray-500">(seconds)</span>
                </label>
                <input
                  name="duration"
                  type="number"
                  min="1"
                  value={testForm.duration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={testing}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Play size={18} className={testing ? 'animate-pulse' : ''} />
                {testing ? 'Running Test...' : 'Run Network Test'}
              </button>
            </form>
            <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Tips</h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Use 8.8.8.8 (Google DNS) for external testing</li>
                <li>Use your router's IP (e.g., 192.168.1.1) for local testing</li>
                <li>Tests over 60 seconds provide better accuracy</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Performance;