import { DashboardData } from "@/types/dashboard-data";
import { savePendingConfig } from "./offline-config";

export const apiClient = {
    getDashboardData: async (): Promise<DashboardData> => {
        const url = "http://192.168.1.1/cgi-bin/dashboard_data.cgi";
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            const response = await fetch(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
              signal: AbortSignal.timeout(8000), // Increase timeout to 8 seconds
            });
          
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
          } catch (error) {
            retryCount++;
            console.warn(`Attempt ${retryCount}/${maxRetries} failed:`, error);
            
            if (retryCount >= maxRetries) {
              console.error("Error fetching dashboard data after retries:", error);
              throw error;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
        
        // This should never be reached due to the throw in the catch block
        throw new Error("Failed to fetch dashboard data after retries");
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
