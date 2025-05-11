import { DashboardData } from "@/types/dashboard-data";
import { savePendingConfig } from "./offline-config";

export const apiClient = {
    getDashboardData: async (): Promise<DashboardData> => {
        const url = "http://192.168.1.1/cgi-bin/dashboard_data.cgi";
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000), // Use AbortSignal for timeout
          });
        
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          throw error; 
        }
    },
    
    // Add a method to update configuration with offline support
    updateConfig: async (endpoint: string, data: unknown): Promise<unknown> => {
        try {
            const url = `http://192.168.1.1/cgi-bin/${endpoint}`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            // Store the configuration for later when online
            savePendingConfig(endpoint, "POST", data);
            
            // Return a mock success response
            return { 
                status: "pending", 
                message: "Configuration saved and will be applied when the system is online" 
            };
        }
    }
};
