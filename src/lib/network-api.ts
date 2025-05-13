import { NetworkData, WirelessConfig, DhcpDnsConfig } from "@/types/network";
import { data } from "react-router-dom";

// Add caching mechanism
const CACHE_DURATION = 60000; // 1 minute cache duration
let interfacesCache: { data: NetworkData; timestamp: number } | null = null;
let wirelessCache: { data: WirelessConfig; timestamp: number } | null = null;
let dhcpDnsCache: { data: DhcpDnsConfig; timestamp: number } | null = null;

export const apiClient = {
  getInterfaces: async (): Promise<NetworkData> => {
    // Check if we have valid cached data
    const now = Date.now();
    if (interfacesCache && (now - interfacesCache.timestamp < CACHE_DURATION)) {
      console.log("Using cached interfaces data");
      return interfacesCache.data;
    }
    
    const url = "http://192.168.1.2/cgi-bin/network.cgi?option=get";

    console.log("getInterfaces Request:", { url, headers: { "Content-Type": "application/json" } });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increase timeout to 8 seconds
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        // Add cache busting
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log("getInterfaces Response:", {
        url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        // Update cache
        interfacesCache = { data, timestamp: now };
        return data;
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error(`Failed to parse response: ${responseText}`);
      }
    } catch (error) {
      console.error("Network Request Error:", error);
      // If we have cached data, return it even if it's stale rather than failing completely
      if (interfacesCache) {
        console.log("Returning stale cached data after fetch failure");
        return interfacesCache.data;
      }
      throw error;
    }
  },

  updateInterface: async (
    id: string,
    data: { gateway: string }
  ): Promise<{ status: string; message: string }> => {
    const url = "http://192.168.1.2/cgi-bin/network.cgi";
    console.log("updateInterface Request:", { url, id, data });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        interface: id,
        gateway: data.gateway,
      }),
    });

    const responseText = await response.text();
    console.log("updateInterface Response:", {
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      return { status: "error", message: "Invalid JSON response" };
    }
  },

  getWireless: async (): Promise<WirelessConfig> => {
    // Check if we have valid cached data
    const now = Date.now();
    if (wirelessCache && (now - wirelessCache.timestamp < CACHE_DURATION)) {
      console.log("Using cached wireless data");
      return wirelessCache.data;
    }
    
    const url = "http://192.168.1.2/cgi-bin/wireless.cgi?option=get";
    console.log("Fetching wireless data from:", url);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log("Wireless API Response:", responseText);
      
      try {
        const data = JSON.parse(responseText);
        console.log("Parsed wireless data:", data);
        
        // Extract the actual wireless config from the response
        // If data has a 'data' property, use that, otherwise use the data itself
        const wirelessConfig = data.data || data;
        
        // Ensure all required fields are present
        const normalizedConfig = {
          ssid: wirelessConfig.ssid || '',
          password: wirelessConfig.password || '',
          channel: wirelessConfig.channel || 'Auto',
          encryption: wirelessConfig.encryption || 'psk2',
          enabled: typeof wirelessConfig.enabled === 'boolean' ? wirelessConfig.enabled : true,
          band: wirelessConfig.band || '2.4g'
        };
        
        console.log("Normalized wireless config:", normalizedConfig);
        
        // Update cache
        wirelessCache = { data: normalizedConfig, timestamp: now };
        return normalizedConfig;
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error(`Failed to parse response: ${responseText}`);
      }
    } catch (error) {
      console.error("Error fetching wireless data:", error);
      // If we have cached data, return it even if it's stale
      if (wirelessCache) {
        return wirelessCache.data;
      }
      throw error;
    }
  },

  updateWireless: async (config: WirelessConfig): Promise<{ status: string; message: string }> => {
    const url = "http://192.168.1.2/cgi-bin/wireless.cgi";
    console.log("updateWireless Request:", { url, config });

    // Validate SSID before sending
    if (!config.ssid || config.ssid.trim() === "" || config.ssid.length > 32) {
      return { status: "error", message: "Invalid SSID" };
    }

    // Send the config as-is without mapping encryption types
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    const responseText = await response.text();
    console.log("updateWireless Response:", {
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      return { status: "error", message: "Invalid JSON response" };
    }
  },

  getDhcpDns: async (): Promise<DhcpDnsConfig> => {
    // Check if we have valid cached data
    const now = Date.now();
    if (dhcpDnsCache && (now - dhcpDnsCache.timestamp < CACHE_DURATION)) {
      console.log("Using cached DHCP/DNS data");
      return dhcpDnsCache.data;
    }
    
    const url = "http://192.168.1.2/cgi-bin/dhcp_dns.cgi?option=get";
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      // Update cache
      dhcpDnsCache = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error("Error fetching DHCP/DNS data:", error);
      // If we have cached data, return it even if it's stale
      if (dhcpDnsCache) {
        return dhcpDnsCache.data;
      }
      throw error;
    }
  },

  updateDhcpDns: async (config: DhcpDnsConfig): Promise<void> => {
    const url = "http://192.168.1.2/cgi-bin/dhcp_dns.cgi";
    console.log("updateDhcpDns Request:", { url, config });
    console.log("Updating DHCP & DNS config:", config);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    const responseText = await response.text();
    console.log("updateDhcpDns Response:", {
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    }
    catch (e) {
      throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}, Body: ${responseText}`);
    }
    // Validate response format
    if (typeof result.status !== "string" || typeof result.message !== "string") {
      throw new Error(`Invalid response format: ${responseText}`);
    }
    return result;
  },

  rebootSystem: async (): Promise<void> => {
    const url = "http://192.168.1.2/cgi-bin/reboot.cgi";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
    }
  },
};
