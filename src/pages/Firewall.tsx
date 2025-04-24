import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { firewallApi } from "@/lib/firewall-api";
import { Shield, Trash2 } from "lucide-react";
import { FirewallConfig, NewFirewallRule } from "@/types/firewall";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import "@/styles/Firewall.css";

function isValidIP(ip: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) &&
    ip.split('.').every((octet) => {
      const num = Number(octet);
      return num >= 0 && num <= 255;
    });
}

function isValidName(name: string): boolean {
  return name.length > 0 && name.length <= 50;
}

export default function Firewall() {
  const { data: firewallData, isLoading, error } = useQuery<FirewallConfig>({
    queryKey: ["firewall"],
    queryFn: () => firewallApi.getFirewall(),
  });

  const [newRule, setNewRule] = useState<NewFirewallRule>({
    name: "",
    source: "",
    destination: "",
    protocol: "TCP",
    action: "ACCEPT",
    enabled: true,
  });

  const [enabled, setEnabled] = useState(firewallData?.enabled ?? false);

  const addRuleMutation = useMutation({
    mutationFn: (rule: NewFirewallRule) => firewallApi.addRule(rule),
    onSuccess: (response) => {
      toast({
        title: response.status === "success" ? "Success" : "Error",
        description: response.message,
        variant: response.status === "success" ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add rule",
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => firewallApi.deleteRule(id),
    onSuccess: (response) => {
      toast({
        title: response.status === "success" ? "Success" : "Error",
        description: response.message,
        variant: response.status === "success" ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  const enableFirewallMutation = useMutation({
    mutationFn: (enabled: boolean) => firewallApi.enableFirewall(enabled),
    onSuccess: (response) => {
      toast({
        title: response.status === "success" ? "Success" : "Error",
        description: response.message,
        variant: response.status === "success" ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update firewall",
        variant: "destructive",
      });
    },
  });

  const validateRule = (rule: NewFirewallRule): boolean => {
    return (
      isValidName(rule.name) &&
      isValidIP(rule.source) &&
      isValidIP(rule.destination) &&
      ["TCP", "UDP", "ICMP"].includes(rule.protocol) &&
      ["ACCEPT", "DROP", "REJECT"].includes(rule.action)
    );
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 firewall-title">Firewall Configuration</h1>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">Failed to load firewall data: {error instanceof Error ? error.message : "Unknown error"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 firewall-title">Firewall Configuration</h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading firewall configuration data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!firewallData) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 firewall-title">Firewall Configuration</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No firewall configuration data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 firewall-title">Firewall Configuration</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Firewall Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center space-x-2 firewall-toggle">
              <Switch
                id="firewall-enabled"
                className="firewall-switch"
                checked={enabled}
                onCheckedChange={(checked) => {
                  setEnabled(checked);
                  enableFirewallMutation.mutate(checked);
                }}
              />
              <Label htmlFor="firewall-enabled">Enable Firewall</Label>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Add New Rule</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Rule Name"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="firewall-input"
                  />
                  {!isValidName(newRule.name) && newRule.name && (
                    <p className="text-red-500 text-xs">Name must be 1-50 characters</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source IP</Label>
                  <Input
                    id="source"
                    placeholder="192.168.1.100"
                    value={newRule.source}
                    onChange={(e) => setNewRule({ ...newRule, source: e.target.value })}
                    className="firewall-input"
                  />
                  {!isValidIP(newRule.source) && newRule.source && (
                    <p className="text-red-500 text-xs">Invalid IP address</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination IP</Label>
                  <Input
                    id="destination"
                    placeholder="192.168.1.200"
                    value={newRule.destination}
                    onChange={(e) => setNewRule({ ...newRule, destination: e.target.value })}
                    className="firewall-input"
                  />
                  {!isValidIP(newRule.destination) && newRule.destination && (
                    <p className="text-red-500 text-xs">Invalid IP address</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select
                    value={newRule.protocol}
                    onValueChange={(value) => setNewRule({ ...newRule, protocol: value })}
                  >
                    <SelectTrigger id="protocol" className="firewall-select">
                      <SelectValue placeholder="Select protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="UDP">UDP</SelectItem>
                      <SelectItem value="ICMP">ICMP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={newRule.action}
                    onValueChange={(value) => setNewRule({ ...newRule, action: value })}
                  >
                    <SelectTrigger id="action" className="firewall-select">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCEPT">ACCEPT</SelectItem>
                      <SelectItem value="DROP">DROP</SelectItem>
                      <SelectItem value="REJECT">REJECT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  className="firewall-button mt-6"
                  onClick={() => {
                    if (validateRule(newRule)) {
                      addRuleMutation.mutate(newRule);
                      setNewRule({
                        name: "",
                        source: "",
                        destination: "",
                        protocol: "TCP",
                        action: "ACCEPT",
                        enabled: true,
                      });
                    } else {
                      toast({
                        title: "Error",
                        description: "Invalid rule configuration",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={addRuleMutation.isPending}
                >
                  {addRuleMutation.isPending ? "Adding..." : "Add Rule"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Firewall Rules</h3>
              {firewallData.rules.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Source IP</th>
                        <th className="px-4 py-2 text-left">Destination IP</th>
                        <th className="px-4 py-2 text-left">Protocol</th>
                        <th className="px-4 py-2 text-left">Action</th>
                        <th className="px-4 py-2 text-left">Enabled</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firewallData.rules.map((rule) => (
                        <tr key={rule.id}>
                          <td className="border px-4 py-2">{rule.name}</td>
                          <td className="border px-4 py-2">{rule.source}</td>
                          <td className="border px-4 py-2">{rule.destination}</td>
                          <td className="border px-4 py-2">{rule.protocol}</td>
                          <td className="border px-4 py-2">{rule.action}</td>
                          <td className="border px-4 py-2">{rule.enabled ? "Yes" : "No"}</td>
                          <td className="border px-4 py-2">
                            <Button
                              type="button"
                              className="firewall-button bg-red-500 hover:bg-red-600"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              disabled={deleteRuleMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No rules available</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}