import { PacketData } from "@/types/packet-analyzer";

interface FetchPacketsOptions {
  count?: number;
  interface?: string;
  filter?: string;
}

export const fetchCapturedPackets = async (options: FetchPacketsOptions = {}): Promise<PacketData[]> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.count) params.append('count', options.count.toString());
    if (options.interface) params.append('interface', options.interface);
    if (options.filter) params.append('filter', options.filter);
    
    const queryString = params.toString();
    const url = `http://192.168.1.2/cgi-bin/packet-analyzer.cgi${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Fetching packets from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
        // Remove Cache-Control header which is causing CORS issues
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("Raw response:", responseText.substring(0, 200) + "...");
    
    if (!responseText || responseText.trim() === '') {
      console.warn("Empty response received from packet analyzer API");
      return getMockPacketData();
    }
    
    try {
      const data = JSON.parse(responseText);
      return data;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Failed to parse response: ${parseError}`);
    }
  } catch (error) {
    console.error("Error fetching captured packets:", error);
    
    // Return mock data for development/offline mode
    return getMockPacketData();
  }
};

// Mock data for development/offline mode
const getMockPacketData = (): PacketData[] => {
  return [
    {
      time: "1621234567.123456",
      src: "192.168.1.100",
      src_port: 54321,
      dst: "8.8.8.8",
      dst_port: 53,
      info: "udp DNS from 192.168.1.100:54321 to 8.8.8.8:53",
      protocol: "udp",
      length: 64,
      type: "DNS",
      flags: "",
      ttl: 64,
      direction: "outbound"
    },
    {
      time: "1621234567.234567",
      src: "8.8.8.8",
      src_port: 53,
      dst: "192.168.1.100",
      dst_port: 54321,
      info: "udp DNS from 8.8.8.8:53 to 192.168.1.100:54321",
      protocol: "udp",
      length: 128,
      type: "DNS",
      flags: "",
      ttl: 57,
      direction: "inbound"
    },
    {
      time: "1621234568.345678",
      src: "192.168.1.100",
      src_port: 49876,
      dst: "93.184.216.34",
      dst_port: 443,
      info: "tcp Web from 192.168.1.100:49876 to 93.184.216.34:443",
      protocol: "tcp",
      length: 76,
      type: "Web",
      flags: "[S]",
      ttl: 64,
      direction: "outbound"
    }
  ];
};
