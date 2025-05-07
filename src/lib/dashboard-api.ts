import { DashboardData } from "@/types/dashboard-data";

export const apiClient = {
    getDashboardData: async (): Promise<DashboardData> => {
        const url = "http://192.168.1.1/cgi-bin/dashboard_data.cgi";
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
      
        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
        }
      
        return response.json();
      },
};