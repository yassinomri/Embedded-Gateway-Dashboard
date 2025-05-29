import axios from 'axios';

export interface Metrics {
  latency: number;
  packetLoss: number;
  throughput: number;
}

export interface HistoryEntry {
  time: string;
  latency: number;
  packetLoss: number;
  throughput: number;
}

export interface PerformanceData {
  maxValues: { latency: number; packetLoss: number; throughput: number };
  averageValues: { latency: number; packetLoss: number; throughput: number };
  metrics: Metrics;
  history: HistoryEntry[];
  qos: { enabled: boolean };
}

export interface UpdatePerformancePayload {
  action: 'test' | 'update';
  targetIp?: string;
  duration?: number;
  qosEnabled?: boolean;
}

export const getPerformance = async (): Promise<PerformanceData> => {
  try {
    const response = await axios.get('http://192.168.1.2/cgi-bin/performance.cgi?action=get');
    console.log('getPerformance Raw Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getPerformance Error:', error);
    throw error;
  }
};

export const updatePerformance = async (payload: UpdatePerformancePayload): Promise<void> => {
  try {
    const response = await axios.post('http://192.168.1.2/cgi-bin/performance.cgi', payload);
    console.log('updatePerformance Response:', response.data);
  } catch (error) {
    console.error('updatePerformance Error:', error);
    throw error;
  }
};