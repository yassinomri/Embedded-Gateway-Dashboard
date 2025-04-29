import Dexie, { Table } from 'dexie';
import { HistoryEntry } from '../lib/performance-api';

class PerformanceDB extends Dexie {
  performanceData!: Table<HistoryEntry & { id?: number }>;
  settings!: Table<{ key: string; value: string }>;

  constructor() {
    super('PerformanceDB');
    this.version(2).stores({
      performanceData: '++id, time, latency, packetLoss, throughput',
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
    };
    await db.performanceData.add(entry);
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
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