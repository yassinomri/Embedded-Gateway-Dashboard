import { DashboardData } from "@/types/dashboard-data";
import { savePendingConfig } from "./offline-config";

// Add a cache for dashboard data
let dashboardDataCache: { data: DashboardData; timestamp: number } | null = null;
const CACHE_DURATION = 10000; // 10 seconds

export const apiClient = {
    getDashboardData: async (): Promise<DashboardData> => {
        // Check if we have valid cached data
        const now = Date.now();
        if (dashboardDataCache && (now - dashboardDataCache.timestamp < CACHE_DURATION)) {
            console.log("Using cached dashboard data");
            return dashboardDataCache.data;
        }
        
        const url = "http://192.168.1.2/cgi-bin/dashboard_data.cgi";
        const maxRetries = 2; // Reduce max retries
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`Fetching dashboard data (attempt ${retryCount + 1})`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Add timestamp to the data
            data.timestamp = now;
            
            // Update cache
            dashboardDataCache = { data, timestamp: now };
            
            return data;
          } catch (error) {
            retryCount++;
            console.warn(`Attempt ${retryCount}/${maxRetries} failed:`, error);
            
            if (retryCount >= maxRetries) {
              console.error("Error fetching dashboard data after retries:", error);
              throw error;
            }
            
            // Wait before retrying (shorter backoff)
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          }
        }
        
        // This should never be reached due to the throw in the loop
        throw new Error("Failed to fetch dashboard data");
    },
    
    // Add a method to update configuration with offline support
    updateConfig: async (endpoint: string, data: unknown): Promise<unknown> => {
        try {
            const url = `http://192.168.1.2/cgi-bin/${endpoint}`;
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
