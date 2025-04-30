import { NetworkData, WirelessConfig, DhcpDnsConfig } from "@/types/network";
import { data } from "react-router-dom";

export const apiClient = {
  getInterfaces: async (): Promise<NetworkData> => {
    const url = "http://localhost:8080/cgi-bin/network.cgi?option=get";

    console.log("getInterfaces Request:", { url, headers: { "Content-Type": "application/json" } });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

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

    let data: NetworkData;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // Fallback: Extract first valid JSON object
      const match = responseText.match(/\{[\s\S]*?\}(?=\s*\{|$)/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
          console.log("getInterfaces Fallback: Parsed first JSON object:", data);
        } catch (fallbackError) {
          throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}, Fallback failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}, Body: ${responseText}`);
        }
      } else {
        throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}, No valid JSON found, Body: ${responseText}`);
      }
    }

    if (!data.interfaces || !Array.isArray(data.interfaces)) {
      throw new Error(`Invalid response format: ${responseText}`);
    }

    return data;
  },

  updateInterface: async (
    id: string,
    data: { address: string; gateway?: string; status: string }
  ): Promise<{ status: string; message: string }> => {
    const url = "http://localhost:8080/cgi-bin/network.cgi";
    console.log("updateInterface Request:", { url, id, data });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        interface: id,
        ip: data.address,
        gateway: data.gateway || "",
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

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}, Body: ${responseText}`);
    }

    return result;
  },

  getWireless: async (): Promise<WirelessConfig> => {
    return {
      ssid: "MyWiFi",
      password: "password123",
      channel: "Auto",
      encryption: "WPA2",
      enabled: true,
    };
  },

  updateWireless: async (config: WirelessConfig): Promise<void> => {
    console.log("Updating wireless config:", config);
  },

  getDhcpDns: async (): Promise<DhcpDnsConfig> => {

    const url = "http://localhost:8080/cgi-bin/dhcp_dns.cgi?option=get"
    console.log("getDhcpDns Request:", { url, headers: { "Content-Type": "application/json" } });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    console.log("getDhcpDns Response:", { 
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
    }

    let data: DhcpDnsConfig;
    try { 
      data = JSON.parse(responseText);
    }
    catch (e) {
      // Fallback: Extract first valid JSON object
      const match = responseText.match(/\{[\s\S]*?\}(?=\s*\{|$)/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
          console.log("getDhcpDns Fallback: Parsed first JSON object:", data);
        } catch (fallbackError) {
          throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}, Fallback failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}, Body: ${responseText}`);
        }
      } else {
        throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}, No valid JSON found, Body: ${responseText}`);
      }
    }
    // Validate required fields
  if (
    typeof data.dhcpEnabled !== "boolean" ||
    !data.rangeStart ||
    !data.rangeEnd ||
    !data.leaseTime ||
    typeof data.dhcpv6 !== "string" ||
    typeof data.ra !== "string"
  ) {
    throw new Error(`Invalid response format: ${responseText}`);
  }
    return data;
  },

  updateDhcpDns: async (config: DhcpDnsConfig): Promise<void> => {
    const url = "http://localhost:8080/cgi-bin/dhcp_dns.cgi";
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
  }
};