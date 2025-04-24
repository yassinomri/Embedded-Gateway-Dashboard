import axios from 'axios';

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

export interface UpdateFirewallPayload {
  action: 'add' | 'update' | 'delete';
  enabled?: boolean;
  rules?: Rule[];
  id?: string;
}

export const getFirewall = async (): Promise<FirewallConfig> => {
  try {
    const response = await axios.get('http://localhost:8080/cgi-bin/firewall.cgi?action=get');
    console.log('getFirewall Raw Response:', response.data);
    // Normalize response
    const normalized: FirewallConfig = {
      enabled: response.data.enabled === 1 || response.data.enabled === true,
      rules: response.data.rules.map((rule: unknown) => ({
        id: rule.id,
        name: rule.name,
        src: rule.src,
        dest: rule.dest,
        proto: rule.proto,
        target: rule.target,
        enabled: rule.enabled === 1 || rule.enabled === true,
      })),
    };
    console.log('getFirewall Normalized:', normalized);
    return normalized;
  } catch (error) {
    console.error('getFirewall Error:', error);
    throw error;
  }
};

export const updateFirewall = async (payload: UpdateFirewallPayload): Promise<void> => {
  try {
    const response = await axios.post('http://localhost:8080/cgi-bin/firewall.cgi', payload);
    console.log('updateFirewall Response:', response.data);
  } catch (error) {
    console.error('updateFirewall Error:', error);
    throw error;
  }
};