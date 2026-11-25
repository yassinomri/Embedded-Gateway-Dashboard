import { SystemInfo } from "@/types/system-info";
import { ubusCall } from "@/lib/ubus";

// Shapes returned by rpcd's built-in "system" object.
interface SystemBoard {
  kernel: string;
  hostname: string;
  system: string;
  model: string;
  release: { distribution: string; version: string; description: string };
}

interface SystemInfoResult {
  localtime: number;
  uptime: number;
  load: [number, number, number];
  memory: { total: number; free: number; available?: number };
}

interface CpuInfo {
  model: string;
  cores: number;
}

const formatUptime = (seconds: number): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${pad(days)}d: ${pad(hours)}h: ${pad(minutes)}m`;
  if (hours > 0) return `${pad(hours)}h: ${pad(minutes)}m`;
  return `${pad(minutes)}m`;
};

// The CPU never changes at runtime, so ask the gateway only once.
let cpuInfoCache: Promise<CpuInfo | null> | null = null;
const getCpuInfo = () => {
  cpuInfoCache ??= ubusCall<CpuInfo>("gateway", "cpu_info").catch(() => {
    cpuInfoCache = null;
    return null;
  });
  return cpuInfoCache;
};

export const apiClient = {
  getSystemInfo: async (): Promise<SystemInfo> => {
    const [board, info, cpu] = await Promise.all([
      ubusCall<SystemBoard>("system", "board"),
      ubusCall<SystemInfoResult>("system", "info"),
      getCpuInfo(),
    ]);

    return {
      version: `${board.release.description} (Linux ${board.kernel})`,
      uptime: formatUptime(info.uptime),
      Date: new Date(info.localtime * 1000).toUTCString(),
      hostname: board.hostname,
      cpuModel: cpu?.model || board.system,
      cpuCores: cpu?.cores ? String(cpu.cores) : "",
      // The UI expects kilobytes; ubus reports bytes.
      memoryTotal: Math.round(info.memory.total / 1024),
      memoryFree: Math.round((info.memory.available ?? info.memory.free) / 1024),
      // ubus reports load averages as fixed-point values scaled by 65536.
      loadAverage: info.load.map((l) => (l / 65536).toFixed(2)).join(" "),
    };
  },

  reboot: async (): Promise<void> => {
    await ubusCall("system", "reboot");
  },
};
