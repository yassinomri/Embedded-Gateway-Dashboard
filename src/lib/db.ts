import Dexie, { Table } from 'dexie';
import { HistoryEntry } from '../lib/performance-api';

// Define the database class
class PerformanceDB extends Dexie {
  performanceData!: Table<HistoryEntry & { id?: number }>;

  constructor() {
    super('PerformanceDB');
    this.version(1).stores({
      performanceData: '++id, time, latency, packetLoss, throughput',
    });
  }
}

const db = new PerformanceDB();

// Function to save performance data
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

// Function to get historical data (last N entries)
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

// Optional: Function to clear old data (e.g., older than 7 days)
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