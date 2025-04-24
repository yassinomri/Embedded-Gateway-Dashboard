import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { firewallApi, NewFirewallRule } from "@/lib/firewall-api";
import { FirewallData } from "@/types/firewall";
import toast from "react-hot-toast";
import "../styles/Firewall.css";

const Firewall = () => {
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState<NewFirewallRule>({
    name: "",
    src: "any",
    dest: "any",
    proto: "all",
    target: "ACCEPT",
    enabled: true,
  });

  // Fetch firewall data
  const { data, error, isLoading } = useQuery<FirewallData>({
    queryKey: ["firewall"],
    queryFn: firewallApi.getFirewall,
  });

  // Mutation to update firewall
  const updateFirewallMutation = useMutation({
    mutationFn: firewallApi.updateFirewall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firewall"] });
      toast.success("Firewall updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update firewall: ${error.message}`);
    },
  });

  // Mutation to add new rule
  const addRuleMutation = useMutation({
    mutationFn: (rule: NewFirewallRule) =>
      firewallApi.updateFirewall({ rules: [rule], action: "add" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firewall"] });
      toast.success("Rule added successfully");
      setNewRule({
        name: "",
        src: "any",
        dest: "any",
        proto: "all",
        target: "ACCEPT",
        enabled: true,
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add rule: ${error.message}`);
    },
  });

  // Handle input changes for existing rules
  const handleRuleChange = (
    id: string,
    field: keyof FirewallData["rules"][0],
    value: string | boolean
  ) => {
    if (!data) return;
    const updatedRules = data.rules.map((rule) =>
      rule.id === id ? { ...rule, [field]: value } : rule
    );
    queryClient.setQueryData(["firewall"], {
      ...data,
      rules: updatedRules,
    });
  };

  // Handle input changes for new rule form
  const handleNewRuleChange = (
    field: keyof NewFirewallRule,
    value: string | boolean
  ) => {
    setNewRule((prev) => ({ ...prev, [field]: value }));
  };

  // Handle global firewall toggle
  const handleFirewallToggle = (enabled: boolean) => {
    if (!data) return;
    queryClient.setQueryData(["firewall"], { ...data, enabled });
  };

  // Save changes
  const handleSave = () => {
    if (!data) return;
    updateFirewallMutation.mutate(data);
  };

  // Add new rule
  const handleAddRule = () => {
    if (!newRule.name) {
      toast.error("Rule name is required");
      return;
    }
    addRuleMutation.mutate(newRule);
  };

  if (isLoading) return <div>Loading firewall data...</div>;
  if (error)
    return <div>Error: Failed to load firewall data: {error.message}</div>;

  return (
    <div className="firewall-container">
      <h1>Firewall Configuration</h1>
      <div className="firewall-controls">
        <label>
          Firewall Enabled:
          <input
            type="checkbox"
            checked={data?.enabled ?? false}
            onChange={(e) => handleFirewallToggle(e.target.checked)}
          />
        </label>
        <button onClick={handleSave}>Save Changes</button>
      </div>
      <div className="firewall-form">
        <h2>Add New Rule</h2>
        <label>
          Name:
          <input
            type="text"
            value={newRule.name}
            onChange={(e) => handleNewRuleChange("name", e.target.value)}
          />
        </label>
        <label>
          Source:
          <input
            type="text"
            value={newRule.src}
            onChange={(e) => handleNewRuleChange("src", e.target.value)}
          />
        </label>
        <label>
          Destination:
          <input
            type="text"
            value={newRule.dest}
            onChange={(e) => handleNewRuleChange("dest", e.target.value)}
          />
        </label>
        <label>
          Protocol:
          <input
            type="text"
            value={newRule.proto}
            onChange={(e) => handleNewRuleChange("proto", e.target.value)}
          />
        </label>
        <label>
          Action:
          <select
            value={newRule.target}
            onChange={(e) => handleNewRuleChange("target", e.target.value)}
          >
            <option value="ACCEPT">ACCEPT</option>
            <option value="DROP">DROP</option>
            <option value="REJECT">REJECT</option>
          </select>
        </label>
        <label>
          Enabled:
          <input
            type="checkbox"
            checked={newRule.enabled}
            onChange={(e) => handleNewRuleChange("enabled", e.target.checked)}
          />
        </label>
        <button onClick={handleAddRule}>Add Rule</button>
      </div>
      <div className="firewall-table">
        <h2>Current Rules</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Protocol</th>
              <th>Action</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {data?.rules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "name", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={rule.src}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "src", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={rule.dest}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "dest", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={rule.proto}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "proto", e.target.value)
                    }
                  />
                </td>
                <td>
                  <select
                    value={rule.target}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "target", e.target.value)
                    }
                  >
                    <option value="ACCEPT">ACCEPT</option>
                    <option value="DROP">DROP</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "enabled", e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Firewall;
