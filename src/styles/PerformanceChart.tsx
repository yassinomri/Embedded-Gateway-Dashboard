import React, { useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartProps {
  history: {
    time: string;
    latency: number;
    packetLoss: number;
    throughput: number;
  }[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ history }) => {
  const formatTime = useCallback((time: string) => {
    const date = new Date(time);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
  );
};

export default React.memo(PerformanceChart);