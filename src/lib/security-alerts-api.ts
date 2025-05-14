import axios from 'axios';
import { SecurityAlert } from '@/components/AlertsCard';

const API_BASE_URL = '/cgi-bin';

export interface AddAlertParams {
  type: SecurityAlert['type'];
  severity: SecurityAlert['severity'];
  message: string;
  source?: string;
  details?: string;
}

export const securityAlertsApi = {
  // Get security alerts
  getAlerts: async (limit: number = 10, includeResolved: boolean = false): Promise<SecurityAlert[]> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/security_alerts.cgi?limit=${limit}&include_resolved=${includeResolved}`
      );
      
      if (response.data.status === 'success') {
        return response.data.alerts || [];
      }
      
      throw new Error(response.data.message || 'Failed to fetch alerts');
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      throw error;
    }
  },
  
  // Add a new alert
  addAlert: async (params: AddAlertParams): Promise<SecurityAlert> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/security_alerts.cgi`, {
        action: 'add',
        ...params
      });
      
      if (response.data.status === 'success') {
        return response.data.alert;
      }
      
      throw new Error(response.data.message || 'Failed to add alert');
    } catch (error) {
      console.error('Error adding security alert:', error);
      throw error;
    }
  },
  
  // Mark an alert as resolved
  resolveAlert: async (id: string): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/security_alerts.cgi`, {
        action: 'resolve',
        id
      });
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to resolve alert');
      }
    } catch (error) {
      console.error('Error resolving security alert:', error);
      throw error;
    }
  }
};