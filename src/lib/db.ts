import Dexie, { Table } from 'dexie';

export interface HistoryEntry {
  time: string;
  latency: number;
  packetLoss: number;
  throughput: number;
  uploadRate: number; // Upload rate in Mbps
  downloadRate: number; // Download rate in Mbps
}

class PerformanceDB extends Dexie {
  performanceData!: Table<HistoryEntry & { id?: number }>;
  settings!: Table<{ key: string; value: string }>;

  constructor() {
    super('PerformanceDB');
    this.version(2).stores({
      performanceData: '++id, time, latency, packetLoss, throughput, uploadRate, downloadRate',
      settings: 'key',
    });
  }
}

const db = new PerformanceDB();

export const savePerformanceData = async (metrics: {
  latency: number;
  packetLoss: number;
  throughput: number;
}) => {
  try {
    const entry: HistoryEntry = {
      time: new Date().toISOString(),
      latency: metrics.latency,
      packetLoss: metrics.packetLoss,
      throughput: metrics.throughput,
      uploadRate: 0, // Default value for upload rate
      downloadRate: 0, // Default value for download rate
    };
    await db.performanceData.add(entry);
  } catch (error) {
    console.error('Error saving performance data to IndexedDB:', error);
  }
};

export const getHistoricalData = async (limit: number = 50): Promise<HistoryEntry[]> => {
  try {
    return await db.performanceData
      .orderBy('time')
      .reverse()
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('Error fetching from IndexedDB:', error);
    return [];
  }
};

export const clearOldData = async (days: number = 7) => {
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    await db.performanceData
      .where('time')
      .below(threshold.toISOString())
      .delete();
  } catch (error) {
    console.error('Error clearing old data:', error);
  }
};

export const saveTargetIp = async (ip: string) => {
  try {
    await db.settings.put({ key: 'targetIp', value: ip });
  } catch (error) {
    console.error('Error saving target IP:', error);
  }
};

export const getTargetIp = async (): Promise<string | null> => {
  try {
    const setting = await db.settings.get('targetIp');
    return setting?.value || null;
  } catch (error) {
    console.error('Error fetching target IP:', error);
    return null;
  }
};

export const saveBandwidthData = async (bandwidth: {
  uploadRate: number;
  downloadRate: number;
}) => {
  try {
    const entry: HistoryEntry = {
      time: new Date().toISOString(),
      latency: 0, // Default value for latency
      packetLoss: 0, // Default value for packet loss
      throughput: 0, // Default value for throughput
      uploadRate: bandwidth.uploadRate,
      downloadRate: bandwidth.downloadRate,
    };
    await db.performanceData.add(entry);
  } catch (error) {
    console.error('Error saving bandwidth data to IndexedDB:', error);
  }
};

export const getBandwidthData = async (limit: number = 50): Promise<
  { time: string; uploadRate: number; downloadRate: number }[]
> => {
  try {
    const data = await db.performanceData
      .orderBy('time')
      .reverse()
      .limit(limit)
      .toArray();

    return data.map(entry => ({
      time: entry.time,
      uploadRate: entry.uploadRate || 0,
      downloadRate: entry.downloadRate || 0,
    }));
  } catch (error) {
    console.error('Error fetching bandwidth data from IndexedDB:', error);
    return [];
  }
};