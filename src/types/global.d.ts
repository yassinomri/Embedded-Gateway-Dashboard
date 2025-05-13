// Add this to your global.d.ts file or create it if it doesn't exist
interface Window {
  syncPendingConfigs: () => Promise<{success: number; failed: number}>;
}