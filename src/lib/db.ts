import Dexie, { Table } from 'dexie';

export interface HistoryEntry {
  time: string;
  latency: number;
  packetLoss: number;
  throughput: number;
  uploadRate: number; // Upload rate in Mbps
  downloadRate: number; // Download rate in Mbps
}

interface BandwidthEntry {
  time: string;
  download: number;
  upload: number;
  type: string; // 'ethernet' or 'wifi'
}

class PerformanceDB extends Dexie {
  performanceData!: Table<HistoryEntry & { id?: number }>;
  settings!: Table<{ key: string; value: string }>;
  bandwidthData!: Table<BandwidthEntry & { id?: number }>;

  constructor() {
    super('PerformanceDB');
    this.version(2).stores({
      performanceData: '++id, time, latency, packetLoss, throughput, uploadRate, downloadRate',
      settings: 'key',
      bandwidthData: '++id, time, type'
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

export const saveBandwidthData = async (type: string, data: Omit<BandwidthEntry, 'type'>) => {
  try {
    await db.bandwidthData.add({
      ...data,
      type
    });
    
    // Clean up old data (keep last 100 entries per type)
    const count = await db.bandwidthData.where('type').equals(type).count();
    if (count > 100) {
      const oldestToKeep = await db.bandwidthData
        .where('type')
        .equals(type)
        .sortBy('time')
        .then(items => items[count - 100].time);
      
      await db.bandwidthData
        .where('type')
        .equals(type)
        .and(item => item.time < oldestToKeep)
        .delete();
    }
  } catch (error) {
    console.error(`Error saving ${type} bandwidth data:`, error);
  }
};

export const getBandwidthData = async (type: string, limit: number = 20): Promise<Omit<BandwidthEntry, 'type'>[]> => {
  try {
    return await db.bandwidthData
      .where('type')
      .equals(type)
      .sortBy('time')
      .then(items => {
        // Get the last 'limit' items
        const result = items.slice(-limit);
        // Return without the 'type' field
        return result.map(({ time, download, upload }) => ({ time, download, upload }));
      });
  } catch (error) {
    console.error(`Error fetching ${type} bandwidth data:`, error);
    return [];
  }
};
