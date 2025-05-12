import { SystemInfo } from "@/types/system-info";

export const apiClient = {
    getSystemInfo: async (): Promise<SystemInfo> => {
        const url = "http://192.168.1.2/cgi-bin/system_info.cgi";
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
}