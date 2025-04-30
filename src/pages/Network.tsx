import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/network-api";
import { Network as NetworkIcon, Wifi, Database } from "lucide-react";
import { NetworkData, WirelessConfig, DhcpDnsConfig } from "@/types/network";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import "@/styles/Network.css";

// Utility functions
function isValidIP(ip: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) &&
    ip.split('.').every((octet) => {
      const num = Number(octet);
      return num >= 0 && num <= 255;
    });
}

function isValidSSID(ssid: string) {
  return ssid.length > 0 && ssid.length <= 32;
}

function isValidPassword(password: string) {
  return password.length >= 8 && password.length <= 63;
}

export default function Network() {
  // Query for interfaces
  const { data: networkData, isLoading: isLoadingInterfaces, error: interfacesError } = useQuery<NetworkData>({
    queryKey: ["network", "interfaces"],
    queryFn: () => apiClient.getInterfaces(),
  });

  // Query for wireless
  const { data: wirelessData, isLoading: isLoadingWireless, error: wirelessError } = useQuery<WirelessConfig>({
    queryKey: ["network", "wireless"],
    queryFn: () => apiClient.getWireless(),
  });

  // Query for DHCP & DNS
  const { data: dhcpDnsData, isLoading: isLoadingDhcpDns, error: dhcpDnsError } = useQuery<DhcpDnsConfig>({
    queryKey: ["network", "dhcp-dns"],
    queryFn: () => apiClient.getDhcpDns(),
  });

  // Log query states for debugging
  useEffect(() => {
    console.log("Network.tsx Query States:", {
      isLoadingInterfaces,
      interfacesError: interfacesError?.message,
      networkData,
      isLoadingWireless,
      wirelessError: wirelessError?.message,
      wirelessData,
      isLoadingDhcpDns,
      dhcpDnsError: dhcpDnsError?.message,
      dhcpDnsData,
    });
  }, [
    isLoadingInterfaces, interfacesError, networkData,
    isLoadingWireless, wirelessError, wirelessData,
    isLoadingDhcpDns, dhcpDnsError, dhcpDnsData,
  ]);

  // State for editing eth0 IP and gateway
  const [eth0Config, setEth0Config] = useState<{ address: string; gateway: string }>({
    address: "",
    gateway: "",
  });

  // State for wireless and DHCP & DNS
  const [wirelessConfig, setWirelessConfig] = useState<WirelessConfig>(
    wirelessData || {
      ssid: '',
      password: '',
      channel: 'Auto',
      encryption: 'WPA2',
      enabled: false,
    }
  );

  const [dhcpDnsConfig, setDhcpDnsConfig] = useState<DhcpDnsConfig>(
    dhcpDnsData || {
      dhcpEnabled: false,
      rangeStart: '',
      rangeEnd: '',
      leaseTime: '3600', 
      dhcpv6: 'server',
      ra: 'server',
      raSlaac: false,
      raFlags: [],
      primaryDns: '',
      secondaryDns: '',
    }
  );
  

  // Mutation for updating eth0
  const interfaceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { address: string; gateway: string } }) =>
      apiClient.updateInterface(id, { address: data.address, gateway: data.gateway, status: "up" }),
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
        description: error instanceof Error ? error.message : "Failed to update interface",
        variant: "destructive",
      });
    },
  });

  // Mutations for wireless and DHCP & DNS (mock)
  const wirelessMutation = useMutation({
    mutationFn: (config: WirelessConfig) => apiClient.updateWireless(config),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wireless configuration updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update wireless configuration",
        variant: "destructive",
      });
    },
  });

  const dhcpDnsMutation = useMutation({
    mutationFn: (config: DhcpDnsConfig) => apiClient.updateDhcpDns(config),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DHCP & DNS configuration updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update DHCP & DNS configuration",
        variant: "destructive",
      });
    },
  });
  

  // Validation functions
  const validateInterface = (data: { address: string; gateway: string }) => {
    return isValidIP(data.address) && (!data.gateway || isValidIP(data.gateway));
  };

  const validateWireless = () => {
    return (
      isValidSSID(wirelessConfig.ssid) &&
      (wirelessConfig.encryption === 'None' || isValidPassword(wirelessConfig.password)) &&
      ['1', '6', '11', 'Auto'].includes(wirelessConfig.channel)
    );
  };

  const validateDhcpDns = () => {
    return (
      (!dhcpDnsConfig.dhcpEnabled || 
        (isValidIP(dhcpDnsConfig.rangeStart) && isValidIP(dhcpDnsConfig.rangeEnd))) &&
      (!dhcpDnsConfig.primaryDns || isValidIP(dhcpDnsConfig.primaryDns)) &&
      (!dhcpDnsConfig.secondaryDns || isValidIP(dhcpDnsConfig.secondaryDns)) &&
      dhcpDnsConfig.leaseTime.trim() !== '' && // Ensure leasetime is not empty
      ['server', 'relay', 'disabled'].includes(dhcpDnsConfig.dhcpv6) && // Validate dhcpv6 mode
      ['server', 'relay', 'disabled'].includes(dhcpDnsConfig.ra) // Validate RA mode
    );
  };

  // Update state when query data changes
  useEffect(() => {
    if (wirelessData) {
      setWirelessConfig(wirelessData);
    }
  }, [wirelessData]);

  useEffect(() => {
    if (dhcpDnsData) {
      setDhcpDnsConfig({
        dhcpEnabled: dhcpDnsData.dhcpEnabled ?? false,
        rangeStart: dhcpDnsData.rangeStart ?? '',
        rangeEnd: dhcpDnsData.rangeEnd ?? '',
        leaseTime: dhcpDnsData.leaseTime ?? '12h',
        dhcpv6: dhcpDnsData.dhcpv6 ?? 'server',
        ra: dhcpDnsData.ra ?? 'server',
        raSlaac: dhcpDnsData.raSlaac ?? false,
        raFlags: dhcpDnsData.raFlags ?? [],
        primaryDns: dhcpDnsData.primaryDns ?? '',
        secondaryDns: dhcpDnsData.secondaryDns ?? '',
      });
    }
  }, [dhcpDnsData]);

  useEffect(() => {
    if (networkData && networkData.interfaces) {
      const eth0 = networkData.interfaces.find((iface) => iface.id === "eth0");
      if (eth0) {
        setEth0Config({
          address: eth0.ipAddress,
          gateway: eth0.gateway || "",
        });
      }
    }
  }, [networkData]);

  // Handle errors
  if (interfacesError || wirelessError || dhcpDnsError) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Network Configuration</h1>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              Failed to load network data: {interfacesError?.message || wirelessError?.message || dhcpDnsError?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle loading state
  if (isLoadingInterfaces || isLoadingWireless || isLoadingDhcpDns) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Network Configuration</h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading network configuration data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle missing data
  if (!networkData || !networkData.interfaces || !wirelessData || !dhcpDnsData) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Network Configuration</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No network configuration data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Network Configuration</h1>

      <Tabs defaultValue="interfaces" className="space-y-4">
        <TabsList>
          <TabsTrigger value="interfaces" className="flex items-center gap-2 custom-tab">
            <NetworkIcon className="h-4 w-4" />
            Interfaces
          </TabsTrigger>
          <TabsTrigger value="wireless" className="flex items-center gap-2 custom-tab">
            <Wifi className="h-4 w-4" />
            Wireless
          </TabsTrigger>
          <TabsTrigger value="dhcp-dns" className="flex items-center gap-2 custom-tab">
            <Database className="h-4 w-4" />
            DHCP & DNS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interfaces" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {networkData.interfaces.map((iface) => (
              <Card key={iface.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <NetworkIcon className="h-4 w-4" />
                    {iface.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`status-${iface.id}`}>Status</Label>
                      <Input id={`status-${iface.id}`} value={iface.status} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`mac-${iface.id}`}>MAC Address</Label>
                      <Input id={`mac-${iface.id}`} value={iface.macAddress} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`address-${iface.id}`}>IPv4 Address</Label>
                      <Input
                        id={`address-${iface.id}`}
                        value={iface.id === "eth0" ? eth0Config.address : iface.ipAddress}
                        onChange={(e) => {
                          if (iface.id === "eth0") {
                            setEth0Config({ ...eth0Config, address: e.target.value });
                          }
                        }}
                        disabled={iface.id !== "eth0"}
                      />
                      {iface.id === "eth0" && !isValidIP(eth0Config.address) && eth0Config.address && (
                        <p className="text-red-500 text-xs">Invalid IP address</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`netmask-${iface.id}`}>Netmask</Label>
                      <Input id={`netmask-${iface.id}`} value={iface.netmask} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`gateway-${iface.id}`}>Gateway</Label>
                      <Input
                        id={`gateway-${iface.id}`}
                        value={iface.id === "eth0" ? eth0Config.gateway : iface.gateway || ""}
                        onChange={(e) => {
                          if (iface.id === "eth0") {
                            setEth0Config({ ...eth0Config, gateway: e.target.value });
                          }
                        }}
                        disabled={iface.id !== "eth0"}
                      />
                      {iface.id === "eth0" && eth0Config.gateway && !isValidIP(eth0Config.gateway) && (
                        <p className="text-red-500 text-xs">Invalid gateway</p>
                      )}
                    </div>
                    {iface.id === "eth0" && (
                      <Button
                        type="button"
                        className="custom-button"
                        onClick={() =>
                          interfaceMutation.mutate({
                            id: iface.id,
                            data: { address: eth0Config.address, gateway: eth0Config.gateway },
                          })
                        }
                        disabled={!validateInterface(eth0Config) || interfaceMutation.isPending}
                      >
                        {interfaceMutation.isPending ? "Saving..." : "Save Interface"}
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wireless">
          <Card>
            <CardHeader>
              <CardTitle>Wireless Networks</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ssid">SSID</Label>
                    <Input
                      id="ssid"
                      placeholder="MyWiFi"
                      value={wirelessConfig.ssid}
                      onChange={(e) => setWirelessConfig({ ...wirelessConfig, ssid: e.target.value })}
                    />
                    {!isValidSSID(wirelessConfig.ssid) && wirelessConfig.ssid && (
                      <p className="text-red-500 text-xs">SSID must be 1-32 characters</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={wirelessConfig.password}
                      onChange={(e) => setWirelessConfig({ ...wirelessConfig, password: e.target.value })}
                      disabled={wirelessConfig.encryption === "None"}
                    />
                    {wirelessConfig.encryption !== "None" &&
                      !isValidPassword(wirelessConfig.password) &&
                      wirelessConfig.password && (
                        <p className="text-red-500 text-xs">Password must be 8-63 characters</p>
                      )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel">Channel</Label>
                    <Select
                      value={wirelessConfig.channel}
                      onValueChange={(value) => setWirelessConfig({ ...wirelessConfig, channel: value })}
                    >
                      <SelectTrigger id="channel">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto">Auto</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="11">11</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="encryption">Encryption</Label>
                    <Select
                      value={wirelessConfig.encryption}
                      onValueChange={(value) => setWirelessConfig({ ...wirelessConfig, encryption: value })}
                    >
                      <SelectTrigger id="encryption">
                        <SelectValue placeholder="Select encryption" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA2">WPA2</SelectItem>
                        <SelectItem value="WPA3">WPA3</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="wireless-enabled"
                    className="custom-switch"
                    checked={wirelessConfig.enabled}
                    onCheckedChange={(checked) => setWirelessConfig({ ...wirelessConfig, enabled: checked })}
                  />
                  <Label htmlFor="wireless-enabled">Enable Wireless</Label>
                </div>
                <Button
                  type="button"
                  className="custom-button"
                  onClick={() => wirelessMutation.mutate(wirelessConfig)}
                  disabled={!validateWireless() || wirelessMutation.isPending}
                >
                  {wirelessMutation.isPending ? "Saving..." : "Save Wireless Config"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dhcp-dns">
          <Card>
            <CardHeader>
              <CardTitle>DHCP & DNS Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">DHCP Settings</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="dhcp-enabled"
                      className="custom-switch"
                      checked={dhcpDnsConfig.dhcpEnabled}
                      onCheckedChange={(checked) => setDhcpDnsConfig({ ...dhcpDnsConfig, dhcpEnabled: checked })}
                    />
                    <Label htmlFor="dhcp-enabled">Enable DHCP Server</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="range-start">Start IP Range</Label>
                      <Input
                        id="range-start"
                        placeholder="192.168.1.100"
                        value={dhcpDnsConfig.rangeStart}
                        onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, rangeStart: e.target.value })}
                        disabled={!dhcpDnsConfig.dhcpEnabled}
                      />
                      {dhcpDnsConfig.dhcpEnabled &&
                        !isValidIP(dhcpDnsConfig.rangeStart) &&
                        dhcpDnsConfig.rangeStart && (
                          <p className="text-red-500 text-xs">Invalid IP address</p>
                        )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="range-end">End IP Range</Label>
                      <Input
                        id="range-end"
                        placeholder="192.168.1.200"
                        value={dhcpDnsConfig.rangeEnd}
                        onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, rangeEnd: e.target.value })}
                        disabled={!dhcpDnsConfig.dhcpEnabled}
                      />
                      {dhcpDnsConfig.dhcpEnabled &&
                        !isValidIP(dhcpDnsConfig.rangeEnd) &&
                        dhcpDnsConfig.rangeEnd && (
                          <p className="text-red-500 text-xs">Invalid IP address</p>
                        )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leasetime">Lease Time</Label>
                      <Input
                        id="leasetime"
                        placeholder="12h"
                        value={dhcpDnsConfig.leaseTime}
                        onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, leaseTime: e.target.value })}
                        disabled={!dhcpDnsConfig.dhcpEnabled}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">IPv6 Settings</h3>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpv6">DHCPv6 Mode</Label>
                    <Select
                      value={dhcpDnsConfig.dhcpv6}
                      onValueChange={(value) => setDhcpDnsConfig({ ...dhcpDnsConfig, dhcpv6: value })}
                      disabled={!dhcpDnsConfig.dhcpEnabled}
                    >
                      <SelectTrigger id="dhcpv6">
                        <SelectValue placeholder="Select DHCPv6 mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="server">Server</SelectItem>
                        <SelectItem value="relay">Relay</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ra">Router Advertisement Mode</Label>
                    <Select
                      value={dhcpDnsConfig.ra}
                      onValueChange={(value) => setDhcpDnsConfig({ ...dhcpDnsConfig, ra: value })}
                      disabled={!dhcpDnsConfig.dhcpEnabled}
                    >
                      <SelectTrigger id="ra">
                        <SelectValue placeholder="Select RA mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="server">Server</SelectItem>
                        <SelectItem value="relay">Relay</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ra-slaac"
                      className="custom-switch"
                      checked={dhcpDnsConfig.raSlaac}
                      onCheckedChange={(checked) => setDhcpDnsConfig({ ...dhcpDnsConfig, raSlaac: checked })}
                      disabled={!dhcpDnsConfig.dhcpEnabled}
                    />
                    <Label htmlFor="ra-slaac">Enable SLAAC</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ra-flags">RA Flags</Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="managed-config"
                          className="custom-switch"
                          checked={dhcpDnsConfig.raFlags.includes("managed-config")}
                          onCheckedChange={(checked) => {
                            const updatedFlags = checked
                              ? [...dhcpDnsConfig.raFlags, "managed-config"]
                              : dhcpDnsConfig.raFlags.filter((flag) => flag !== "managed-config");
                            setDhcpDnsConfig({ ...dhcpDnsConfig, raFlags: updatedFlags });
                          }}
                          disabled={!dhcpDnsConfig.dhcpEnabled}
                        />
                        <Label htmlFor="managed-config">Managed Config</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="other-config"
                          className="custom-switch"
                          checked={dhcpDnsConfig.raFlags.includes("other-config")}
                          onCheckedChange={(checked) => {
                            const updatedFlags = checked
                              ? [...dhcpDnsConfig.raFlags, "other-config"]
                              : dhcpDnsConfig.raFlags.filter((flag) => flag !== "other-config");
                            setDhcpDnsConfig({ ...dhcpDnsConfig, raFlags: updatedFlags });
                          }}
                          disabled={!dhcpDnsConfig.dhcpEnabled}
                        />
                        <Label htmlFor="other-config">Other Config</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">DNS Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-dns">Primary DNS</Label>
                      <Input
                        id="primary-dns"
                        placeholder="8.8.8.8"
                        value={dhcpDnsConfig.primaryDns}
                        onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, primaryDns: e.target.value })}
                      />
                      {!isValidIP(dhcpDnsConfig.primaryDns) && dhcpDnsConfig.primaryDns && (
                        <p className="text-red-500 text-xs">Invalid DNS address</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-dns">Secondary DNS</Label>
                      <Input
                        id="secondary-dns"
                        placeholder="8.8.4.4"
                        value={dhcpDnsConfig.secondaryDns}
                        onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, secondaryDns: e.target.value })}
                      />
                      {!isValidIP(dhcpDnsConfig.secondaryDns) && dhcpDnsConfig.secondaryDns && (
                        <p className="text-red-500 text-xs">Invalid DNS address</p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  className="custom-button"
                  onClick={() => dhcpDnsMutation.mutate(dhcpDnsConfig)}
                  disabled={!validateDhcpDns() || dhcpDnsMutation.isPending}
                >
                  {dhcpDnsMutation.isPending ? "Saving..." : "Save DHCP & DNS Config"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}