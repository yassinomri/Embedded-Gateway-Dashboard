import axios from 'axios';
import { ApiFirewallConfig, ApiRule, FirewallConfig, Rule, UpdateFirewallPayload } from '@/types/firewall';



// Create a configured axios instance with timeout and base URL
const firewallApi = axios.create({
  baseURL: 'http://192.168.1.1',
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
    
    // Update cache
    cachedFirewallConfig = normalized;
    lastFetchTime = now;
    
    return normalized;
  } catch (error) {
    // If network error, return cached data if available
    if (error.code === 'ECONNABORTED' && cachedFirewallConfig) {
      return cachedFirewallConfig;
    }
    console.error('getFirewall Error:', error);
    throw error;
  }
};

export const updateFirewall = async (payload: UpdateFirewallPayload): Promise<void> => {
  try {
    await firewallApi.post('/cgi-bin/firewall.cgi', payload);
    
    // Invalidate cache after update
    cachedFirewallConfig = null;
  } catch (error) {
    console.error('updateFirewall Error:', error);
    throw error;
  }
};