import { FirewallConfig, NewFirewallRule, FirewallRule, RawFirewallRule, DeleteFirewallRule } from "@/types/firewall";

export const firewallApi = {
  getFirewall: async (): Promise<FirewallConfig> => {
    const url = "/cgi-bin/firewall.cgi?action=get";
    console.log("getFirewall Request:", { url });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("getFirewall Response:", data);

    if (!data.rules || !Array.isArray(data.rules)) {
      throw new Error("Invalid firewall data: rules missing or not an array");
    }

    return {
      enabled: data.enabled,
      rules: data.rules.map((rule: RawFirewallRule) => ({
        id: rule.id || `rule-${Math.random().toString(36).slice(2)}`,
        name: rule.name,
        source: rule.src_ip,
        destination: rule.dest_ip,
        protocol: (rule.proto || "").toUpperCase(),
        action: (rule.target || "").toUpperCase(),
        enabled: rule.enabled,
      })),
    } as FirewallConfig;
  },

  updateFirewall: async (payload: {
    rules?: Array<RawFirewallRule | DeleteFirewallRule>;
    enabled?: boolean;
    action?: "add" | "update" | "delete";
  }): Promise<{ status: string; message: string }> => {
    const url = "/cgi-bin/firewall.cgi";
    console.log("updateFirewall Request:", payload);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("updateFirewall Response:", data);

    return data as { status: string; message: string };
  },

  addRule: async (newRule: NewFirewallRule): Promise<{ status: string; message: string }> => {
    console.log("addRule Request:", newRule);
    return firewallApi.updateFirewall({
      action: "add",
      rules: [{
        name: newRule.name,
        src_ip: newRule.source,
        dest_ip: newRule.destination,
        proto: newRule.protocol.toLowerCase(),
        target: newRule.action.toLowerCase(),
        enabled: newRule.enabled ?? true,
        src: "lan",
        dest: "wan",
      }],
    });
  },

  enableFirewall: async (enabled: boolean): Promise<{ status: string; message: string }> => {
    console.log("enableFirewall Request:", enabled);
    return firewallApi.updateFirewall({
      enabled,
    });
  },

  deleteRule: async (id: string): Promise<{ status: string; message: string }> => {
    console.log("deleteRule Request:", { id });
    return firewallApi.updateFirewall({
      action: "delete",
      rules: [{ id }],
    });
  },
};