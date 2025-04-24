export interface FirewallConfig {
  enabled: boolean;
  rules: FirewallRule[];
}

export interface FirewallRule {
  id: string;
  name: string;
  source: string;
  destination: string;
  protocol: string;
  action: string;
  enabled: boolean;
}

export type NewFirewallRule = Omit<FirewallRule, "id">;

export interface RawFirewallRule {
  id?: string;
  name: string;
  src?: string; // e.g., "lan"
  dest?: string; // e.g., "wan"
  src_ip?: string;
  dest_ip?: string;
  proto?: string;
  target?: string;
  protocol?: string;
  action?: string;
  enabled: boolean;
}

export interface DeleteFirewallRule {
  id: string;
}