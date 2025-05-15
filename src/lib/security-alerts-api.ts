import { SecurityAlert } from '@/components/AlertsCard';

// Base URL for API requests - make sure this points to the correct server
const API_BASE_URL = 'http://192.168.1.2/cgi-bin';

// Add cache for alerts data
let alertsCache: { data: SecurityAlert[]; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache duration

// Mock data for development or when API fails
const MOCK_ALERTS: SecurityAlert[] = [
  {
    id: 'mock-1',
    type: 'firewall',
    severity: 'medium',
    message: 'Unusual outbound connection attempts detected',
    timestamp: new Date().toISOString(),
    source: 'Firewall Monitor',
    details: 'Multiple connection attempts to port 445 from internal device',
    resolved: false
  },
  {
    id: 'mock-2',
    type: 'wifi',
    severity: 'low',
    message: 'New device connected to network',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    source: 'WiFi Controller',
    details: 'Device MAC: 00:11:22:33:44:55',
    resolved: false
  }
];

// Function to handle API errors
const handleApiError = (error: Error | unknown) => {
  console.error('Security alerts API error:', error);
  throw error;
};

// Security alerts API functions
export const securityAlertsApi = {
  // Get security alerts
  async getAlerts(limit: number = 10, includeResolved: boolean = false): Promise<SecurityAlert[]> {
    try {
      // Check if we have valid cached data
      const now = Date.now();
      if (alertsCache && (now - alertsCache.timestamp < CACHE_DURATION)) {
        console.log("Using cached alerts data");
        return alertsCache.data;
      }

      console.log(`Fetching alerts from ${API_BASE_URL}/security_alerts.cgi?limit=${limit}&includeResolved=${includeResolved}`);
      
      // Try a direct fetch to the JSON file as a fallback
      let response;
      try {
        response = await fetch(
          `${API_BASE_URL}/security_alerts.cgi?limit=${limit}&includeResolved=${includeResolved}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit'
          }
        );
      } catch (fetchError) {
        console.error("Initial fetch failed:", fetchError);
        throw fetchError;
      }

      console.log("Response status:", response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log("Response text:", responseText);
      
      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response received from security alerts API');
        // Return cached data if available, otherwise use mock data
        if (alertsCache) {
          console.log("Returning cached data after empty response");
          return alertsCache.data;
        }
        console.log("Using mock alerts data due to empty API response");
        return MOCK_ALERTS;
      }

      try {
        const data = JSON.parse(responseText);
        console.log("Parsed data:", data);
        const alerts = data.alerts || [];
        
        // Update cache
        alertsCache = { data: alerts, timestamp: now };
        
        return alerts;
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', responseText);
        // Return cached data if available, otherwise use mock data
        if (alertsCache) {
          console.log("Returning cached data after parse error");
          return alertsCache.data;
        }
        console.log("Using mock alerts data due to parse error");
        return MOCK_ALERTS;
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Return cached data if available, otherwise use mock data
      if (alertsCache) {
        console.log("Returning cached data after error");
        return alertsCache.data;
      }
      console.log("Using mock alerts data due to API error");
      return MOCK_ALERTS;
    }
  },

  // Resolve a security alert
  async resolveAlert(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/security_alerts.cgi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resolve',
          id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve alert: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      handleApiError(error);
      return false;
    }
  },

  // Delete a security alert
  async deleteAlert(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/security_alerts.cgi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete alert: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      handleApiError(error);
      return false;
    }
  },
};







