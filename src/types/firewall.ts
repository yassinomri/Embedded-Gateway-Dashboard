export interface Rule {
  id: string;
  name: string;
  src: string;
  dest: string;
  proto: string;
  target: string;
  enabled: boolean;
}

export interface FirewallConfig {
  enabled: boolean;
  rules: Rule[];
}

// Interface for raw API response
export interface ApiRule {
  id: string;
  name: string;
  src: string;
  dest: string;
  proto: string;
  target: string;
  enabled: number; // API returns 1 or 0
}

export interface ApiFirewallConfig {
  enabled: number; // API returns 1 or 0
  rules: ApiRule[];
}

export interface UpdateFirewallPayload {
  action: 'add' | 'update' | 'delete';
  enabled?: boolean;
  rules?: Rule[];
  id?: string;
}