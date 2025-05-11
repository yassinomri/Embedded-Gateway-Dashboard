// Queue for storing pending configuration changes
interface PendingConfig {
  endpoint: string;
  method: string;
  data: unknown;
  timestamp: number;
}

// Save pending configuration to localStorage
export const savePendingConfig = (endpoint: string, method: string, data: unknown): void => {
  const pendingConfigs: PendingConfig[] = JSON.parse(
    localStorage.getItem('pendingConfigs') || '[]'
  );
  
  pendingConfigs.push({
    endpoint,
    method,
    data,
    timestamp: Date.now()
  });
  
  localStorage.setItem('pendingConfigs', JSON.stringify(pendingConfigs));
};

// Get all pending configurations
export const getPendingConfigs = (): PendingConfig[] => {
  return JSON.parse(localStorage.getItem('pendingConfigs') || '[]');
};

// Remove a specific pending configuration
export const removePendingConfig = (index: number): void => {
  const pendingConfigs = getPendingConfigs();
  pendingConfigs.splice(index, 1);
  localStorage.setItem('pendingConfigs', JSON.stringify(pendingConfigs));
};

// Clear all pending configurations
export const clearPendingConfigs = (): void => {
  localStorage.setItem('pendingConfigs', JSON.stringify([]));
};