import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Wifi, Network, Play, RefreshCw, Settings } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { getPerformance, updatePerformance, PerformanceData } from '../lib/performance-api';

interface TestForm {
  targetIp: string;
  duration: number;
}

const Performance = () => {
  const [data, setData] = useState<PerformanceData>({
    metrics: { latency: 0, packetLoss: 0, throughput: 0 },
    history: [],
    qos: { enabled: false },
  });
  const [testForm, setTestForm] = useState<TestForm>({ targetIp: '8.8.8.8', duration: 30 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  // Fetch performance data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await getPerformance();
      // Validate response
      if (!response.qos || typeof response.qos.enabled !== 'boolean') {
        throw new Error('Invalid QoS data');
      }
      if (!Array.isArray(response.history)) {
        response.history = [];
      }
      // Validate metrics
      response.metrics.latency = isNaN(response.metrics.latency) ? 0 : response.metrics.latency;
      response.metrics.packetLoss = isNaN(response.metrics.packetLoss) ? 0 : response.metrics.packetLoss;
      response.metrics.throughput = isNaN(response.metrics.throughput) ? 0 : response.metrics.throughput;
      // Validate history entries
      response.history = response.history.map(entry => ({
        time: entry.time || new Date().toISOString(),
        latency: isNaN(entry.latency) ? 0 : entry.latency,
        packetLoss: isNaN(entry.packetLoss) ? 0 : entry.packetLoss,
        throughput: isNaN(entry.throughput) ? 0 : entry.throughput,
      }));
      setData(response);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch performance data',
      });
      // Set fallback data
      setData({
        metrics: { latency: 0, packetLoss: 0, throughput: 0 },
        history: [],
        qos: { enabled: false },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Poll data every 10s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle test form input changes
  const handleTestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestForm((prev) => ({ ...prev, [name]: name === 'duration' ? parseInt(value, 10) : value }));
  };

  // Handle test submission
  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.targetIp || testForm.duration <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Valid target IP and duration are required',
      });
      return;
    }

    try {
      setTesting(true);
      await updatePerformance({
        action: 'test',
        targetIp: testForm.targetIp,
        duration: testForm.duration,
      });
      toast({
        title: 'Success',
        description: 'Network test started',
      });
      await fetchData();
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to run network test',
      });
    } finally {
      setTesting(false);
    }
  };

  // Handle QoS toggle
  const handleToggleQoS = async () => {
    const newEnabled = !data.qos.enabled;
    try {
      await updatePerformance({ action: 'update', qosEnabled: newEnabled });
      toast({
        title: 'Success',
        description: `QoS ${newEnabled ? 'enabled' : 'disabled'} successfully`,
      });
      await fetchData();
    } catch (error) {
      console.error('Error toggling QoS:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to toggle QoS',
      });
    }
  };

  // Manually refresh data
  const handleRefresh = () => {
    fetchData();
  };

  // Format time for chart X-axis
  const formatTime = (time: string) => {
    const date = new Date(time);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-blue-600">Loading Network Performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 bg-gray-50">
      <div className="flex flex-col gap-6 max-w-full">
        {/* Header Section with Title and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Network size={24} color="#2563eb" />
            <h1 className="text-3xl font-bold text-gray-800">Network Performance</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={refreshing}
            >
              <RefreshCw size={18} className={`${refreshing ? 'animate-spin' : ''} text-gray-600`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
            <button
              onClick={handleToggleQoS}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                data.qos.enabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Settings size={18} />
              <span className="text-sm font-medium">QoS {data.qos.enabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Latency</p>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-bold text-gray-900">{data.metrics.latency}</h3>
                    <span className="text-lg text-gray-500">ms</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-amber-100 rounded-full">
                  <Activity className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Packet Loss</p>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-bold text-gray-900">{data.metrics.packetLoss}</h3>
                    <span className="text-lg text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Wifi className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Throughput</p>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-bold text-gray-900">{data.metrics.throughput}</h3>
                    <span className="text-lg text-gray-500">Mbps</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Performance History Chart */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Historical Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      stroke="#6b7280"
                      fontSize={12}
                      tickMargin={10}
                      tickFormatter={formatTime}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                    />
                    <Line type="monotone" dataKey="latency" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Latency (ms)" />
                    <Line type="monotone" dataKey="packetLoss" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} name="Packet Loss (%)" />
                    <Line type="monotone" dataKey="throughput" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="Throughput (Mbps)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performance Test Panel */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Network Performance Test</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleRunTest}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target IP</label>
                  <input
                    type="text"
                    name="targetIp"
                    value={testForm.targetIp}
                    onChange={handleTestInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="8.8.8.8"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Duration
                    <span className="text-gray-500 ml-1">(seconds)</span>
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={testForm.duration}
                    onChange={handleTestInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="30"
                    min="1"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={testing}
                >
                  <Play size={18} className={testing ? 'animate-pulse' : ''} />
                  <span className="font-medium">{testing ? 'Running Test...' : 'Run Network Test'}</span>
                </button>
              </form>

              {/* Quick Tips */}
              <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Tips</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use 8.8.8.8 (Google DNS) for external connectivity testing</li>
                  <li>• For local network testing, use your router's IP (typically 192.168.1.1)</li>
                  <li>• Tests longer than 60 seconds provide more accurate results</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Performance;