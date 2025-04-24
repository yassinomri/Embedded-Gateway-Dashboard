export interface FirewallData {
    rules: Array<{
      id: string; // e.g., firewall.@rule[0]
      name: string; // Rule name or description
      src: string; // Source zone (e.g., "lan", "wan")
      dest: string; // Destination zone (e.g., "wan", "lan")
      proto: string; // Protocol (e.g., "tcp", "udp", "all")
      target: string; // Action (e.g., "ACCEPT", "DROP", "REJECT")
      enabled: boolean; // Rule enabled status
    }>;
    enabled: boolean; // Global firewall enabled status
  }