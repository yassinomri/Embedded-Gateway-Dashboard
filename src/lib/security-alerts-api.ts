import { SecurityAlert } from '@/components/AlertsCard';

// Base URL for API requests
const API_BASE_URL = '/cgi-bin';

// Function to handle API errors
const handleApiError = (error: any) => {
  console.error('Security alerts API error:', error);
  throw error;
};

// Security alerts API functions
export const securityAlertsApi = {
  // Get security alerts
  async getAlerts(limit: number = 10, includeResolved: boolean = false): Promise<SecurityAlert[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/security_alerts.cgi?limit=${limit}&includeResolved=${includeResolved}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      handleApiError(error);
      return [];
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
