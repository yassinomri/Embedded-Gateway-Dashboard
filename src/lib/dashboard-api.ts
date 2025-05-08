import { DashboardData } from "@/types/dashboard-data";

export const apiClient = {
    getDashboardData: async (): Promise<DashboardData> => {
        const url = "http://localhost:8080/cgi-bin/dashboard_data.cgi";
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

        // Check if the response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Response is not JSON");
        } 
        console.log("Response is JSON");
      
        return response.json();
      },
};