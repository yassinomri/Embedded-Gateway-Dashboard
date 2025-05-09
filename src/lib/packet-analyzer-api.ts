import { PacketData } from "@/types/packet-analyzer";

export const fetchCapturedPackets = async (): Promise<PacketData[]> => {
  try {
    const response = await fetch("http://192.168.1.1/cgi-bin/packet-analyzer.cgi?option=GET");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const jsonStartIndex = text.indexOf("["); // Find the start of the JSON array
    if (jsonStartIndex === -1) {
      throw new Error("Invalid response format: JSON data not found");
    }

    const jsonString = text.substring(jsonStartIndex); // Extract the JSON part
    return JSON.parse(jsonString); // Parse the JSON
  } catch (error) {
    console.error("Error fetching captured packets:", error);
    throw error;
  }
};