import axios from 'axios';
import { ApiFirewallConfig, ApiRule, FirewallConfig, Rule, UpdateFirewallPayload } from '@/types/firewall';
import { savePendingConfig } from './offline-config';

// Create a configured axios instance with timeout and base URL
const firewallApi = axios.create({
  baseURL: 'http://192.168.1.2',
  timeout: 5000, // 5 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Normalize API rule to client rule (moved to separate function for clarity)
const normalizeRule = (rule: ApiRule): Rule => ({
  id: rule.id,
  name: rule.name,
  src: rule.src,
  dest: rule.dest,
  proto: rule.proto,
  target: rule.target,
  enabled: rule.enabled === 1,
});

// Cache the firewall config to avoid unnecessary requests
let cachedFirewallConfig: FirewallConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds cache validity

export const getFirewall = async (forceRefresh = false): Promise<FirewallConfig> => {
  const now = Date.now();
  
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && cachedFirewallConfig && (now - lastFetchTime < CACHE_TTL)) {
    return cachedFirewallConfig;
  }
  
  try {
    const response = await firewallApi.get<ApiFirewallConfig>('/cgi-bin/firewall.cgi?action=get');
    
    // Normalize response
    const normalized: FirewallConfig = {
      enabled: response.data.enabled === 1,
      rules: Array.isArray(response.data.rules) 
        ? response.data.rules.map(normalizeRule)
        : []
    };
    
    // Update cache and localStorage for offline use
    cachedFirewallConfig = normalized;
    lastFetchTime = now;
    localStorage.setItem('firewallConfig', JSON.stringify(normalized));
    
    return normalized;
  } catch (error) {
    console.error('getFirewall Error:', error);
    
    // If network error, return cached data if available
    if (cachedFirewallConfig) {
      return cachedFirewallConfig;
    }
    
    // Try to load from localStorage if no in-memory cache
    const storedConfig = localStorage.getItem('firewallConfig');
    if (storedConfig) {
      const parsedConfig = JSON.parse(storedConfig);
      cachedFirewallConfig = parsedConfig;
      return parsedConfig;
    }
    
    throw error;
  }
};

export const updateFirewall = async (payload: UpdateFirewallPayload): Promise<{status: string, message: string}> => {
  try {
    await firewallApi.post('/cgi-bin/firewall.cgi', payload);
    
    // Invalidate cache after update
    cachedFirewallConfig = null;
    
    // Update local storage with new config if it's an update
    if (payload.action === 'update' && payload.enabled !== undefined) {
      const storedConfig = localStorage.getItem('firewallConfig');
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        parsedConfig.enabled = payload.enabled;
        localStorage.setItem('firewallConfig', JSON.stringify(parsedConfig));
      }
    }
    
    return { status: 'success', message: 'Firewall updated successfully' };
  } catch (error) {
    console.error('updateFirewall Error:', error);
    
    // Store the configuration for later when online
    savePendingConfig('firewall.cgi', 'POST', payload);
    
    // Update local storage to reflect changes for offline mode
    updateLocalStorageFirewall(payload);
    
    return { 
      status: 'pending', 
      message: 'Firewall configuration saved and will be applied when the gateway is online' 
    };
  }
};

// Helper function to update localStorage with pending changes
function updateLocalStorageFirewall(payload: UpdateFirewallPayload): void {
  const storedConfig = localStorage.getItem('firewallConfig');
  if (!storedConfig) return;
  
  const config: FirewallConfig = JSON.parse(storedConfig);
  
  // Handle different action types
  switch (payload.action) {
    case 'update':
      // Update global enabled state
      if (payload.enabled !== undefined) {
        config.enabled = payload.enabled;
      }
      
      // Update specific rules
      if (payload.rules && payload.rules.length > 0) {
        config.rules = config.rules.map(rule => {
          const updatedRule = payload.rules?.find(r => r.id === rule.id);
          return updatedRule || rule;
        });
      }
      break;
      
    case 'add':
      if (payload.rules && payload.rules.length > 0) {
        config.rules = [...config.rules, ...payload.rules];
      }
      break;
      
    case 'delete':
      if (payload.id) {
        config.rules = config.rules.filter(rule => rule.id !== payload.id);
      }
      break;
  }
  
  localStorage.setItem('firewallConfig', JSON.stringify(config));
}

