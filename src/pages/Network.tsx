import { useMutation, useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/network-api";
import { Network as NetworkIcon, Wifi, Database, WifiOff, Eye, EyeOff } from "lucide-react";
import { NetworkData, WirelessConfig, DhcpDnsConfig } from "@/types/network";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import "@/styles/Network.css";
import { savePendingConfig } from "@/lib/offline-config";

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

const isValidLastOctet = (octet: string): boolean => {
  const num = parseInt(octet, 10);
  return !isNaN(num) && num >= 0 && num <= 255;
};

export default function Network() {
  const queryClient = useQueryClient();

  // Add a state to track if the gateway is online
  const [isGatewayOnline, setIsGatewayOnline] = useState(false);

  // Function to check if gateway is online
  const checkGatewayStatus = async () => {
    try {
      // Try to fetch a simple resource from the gateway
      const response = await fetch("http://192.168.1.1/cgi-bin/ping.cgi", {
        method: "GET",
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        setIsGatewayOnline(true);
        return true;
      } else {
        setIsGatewayOnline(false);
        return false;
      }
    } catch (error) {
      setIsGatewayOnline(false);
      return false;
    }
  };

  // Set up periodic checking
  useEffect(() => {
    // Check immediately on component mount
    checkGatewayStatus();
    
    // Set up interval to check periodically
    const intervalId = setInterval(() => {
      checkGatewayStatus();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Add state for password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Query for interfaces
  const { data: networkData, isLoading: isLoadingInterfaces, error: interfacesError } = useQuery<NetworkData>({
    queryKey: ["network", "interfaces"],
    queryFn: async () => {
      try {
        const data = await apiClient.getInterfaces();
        setIsGatewayOnline(true);
        // Cache the data for offline use
        localStorage.setItem("networkInterfaces", JSON.stringify(data));
        return data;
      } catch (error) {
        setIsGatewayOnline(false);
        // Try to load from cache
        const cachedData = localStorage.getItem("networkInterfaces");
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        throw error;
      }
    },
    // Don't retry too aggressively when offline
    retry: 1,
    retryDelay: 3000,
  });

  // Query for wireless
  const { data: wirelessData, isLoading: isLoadingWireless, error: wirelessError } = useQuery<WirelessConfig>({
    queryKey: ["network", "wireless"],
    queryFn: async () => {
      try {
        const data = await apiClient.getWireless();
        setIsGatewayOnline(true);
        localStorage.setItem("wirelessConfig", JSON.stringify(data));
        return data;
      } catch (error) {
        setIsGatewayOnline(false);
        const cachedData = localStorage.getItem("wirelessConfig");
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        throw error;
      }
    },
    retry: 1,
    retryDelay: 3000,
  });

  // Query for DHCP & DNS
  const { data: dhcpDnsData, isLoading: isLoadingDhcpDns, error: dhcpDnsError } = useQuery<DhcpDnsConfig>({
    queryKey: ["network", "dhcp-dns"],
    queryFn: async () => {
      try {
        const data = await apiClient.getDhcpDns();
        setIsGatewayOnline(true);
        localStorage.setItem("dhcpDnsConfig", JSON.stringify(data));
        return data;
      } catch (error) {
        setIsGatewayOnline(false);
        const cachedData = localStorage.getItem("dhcpDnsConfig");
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        throw error;
      }
    },
    retry: 1,
    retryDelay: 3000,
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

  // State for editing interface gateway
  const [interfaceConfig, setInterfaceConfig] = useState<{ [key: string]: { gateway: string } }>({});

  // State for wireless and DHCP & DNS
  const [wirelessConfig, setWirelessConfig] = useState<WirelessConfig & { band?: string }>(
    wirelessData || {
      ssid: '',
      password: '',
      channel: 'Auto',
      encryption: 'WPA2',
      enabled: false,
      band: '2.4g', // Default to 2.4GHz
    }
  );

      // Update channel when band changes
  useEffect(() => {
    if (wirelessConfig.band === '5g' && 
        !['Auto', '36', '40', '44', '48'].includes(wirelessConfig.channel)) {
      setWirelessConfig({
        ...wirelessConfig,
        channel: 'Auto'
      });
    } else if (wirelessConfig.band === '2.4g' && 
              !['Auto', '1', '6', '11'].includes(wirelessConfig.channel)) {
      setWirelessConfig({
        ...wirelessConfig,
        channel: 'Auto'
      });
    }
  }, [wirelessConfig, wirelessConfig.band]);

  const [dhcpDnsConfig, setDhcpDnsConfig] = useState<DhcpDnsConfig>(
    dhcpDnsData || {
      dhcpEnabled: false,
      rangeStart: '',
      rangeEnd: '',
      leaseTime: '3600', 
      dhcpv6: 'server',
      ra: 'server',
      raSlaac: false,
      primaryDns: '',
      secondaryDns: '',
    }
  );
  

  // Mutation for updating interface
  const interfaceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { gateway: string } }) => {
      try {
        // Try to update online
        const response = await apiClient.updateInterface(id, { gateway: data.gateway });
        setIsGatewayOnline(true);
        return response;
      } catch (error) {
        // If offline, save for later
        setIsGatewayOnline(false);
        savePendingConfig(`network.cgi?interface=${id}`, "POST", { 
          interface: id, 
          gateway: data.gateway 
        });
        return { 
          status: "pending", 
          message: "Configuration saved and will be applied when the gateway is online" 
        };
      }
    },
    onSuccess: (response) => {
      toast({
        title: response.status === "success" ? "Success" : "Pending",
        description: response.message,
        variant: response.status === "success" ? "default" : "default",
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

  // Wireless mutation with offline support
  const wirelessMutation = useMutation({
    mutationFn: async (config: WirelessConfig) => {
      try {
        const response = await apiClient.updateWireless(config);
        setIsGatewayOnline(true);
        return response;
      } catch (error) {
        setIsGatewayOnline(false);
        savePendingConfig("wireless.cgi", "POST", config);
        return { 
          status: "pending", 
          message: "Wireless configuration saved and will be applied when the gateway is online" 
        };
      }
    },
    onSuccess: (response) => {
      toast({
        title: response.status === "success" ? "Success" : "Pending",
        description: response.message,
      });
      // Invalidate the wireless query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["network", "wireless"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update wireless configuration",
        variant: "destructive",
      });
    },
  });

  // DHCP & DNS mutation with offline support
  const dhcpDnsMutation = useMutation({
    mutationFn: async (config: DhcpDnsConfig) => {
      try {
        await apiClient.updateDhcpDns(config);
        setIsGatewayOnline(true);
        return { status: "success", message: "DHCP & DNS configuration updated successfully" };
      } catch (error) {
        setIsGatewayOnline(false);
        savePendingConfig("dhcp_dns.cgi", "POST", config);
        return { 
          status: "pending", 
          message: "DHCP & DNS configuration saved and will be applied when the gateway is online" 
        };
      }
    },
    onSuccess: (response) => {
      toast({
        title: response.status === "success" ? "Success" : "Pending",
        description: response.message,
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
  const validateInterface = (data: { gateway: string }) => {
    return data.gateway && isValidIP(data.gateway);
  };

  const validateWireless = () => {
    // Trim the SSID to check for empty strings with spaces
    if (!wirelessConfig.ssid || wirelessConfig.ssid.trim() === "" || wirelessConfig.ssid.length > 32) {
      return false;
    }
    
    if (wirelessConfig.encryption !== "None" && !isValidPassword(wirelessConfig.password)) {
      return false;
    }
    
    return true;
  };

  const isValidSSID = (ssid: string) => {
    return ssid && ssid.trim() !== "" && ssid.length <= 32;
  };

  const isValidPassword = (password: string) => {
    return wirelessConfig.encryption === "None" || (password.length >= 8 && password.length <= 63);
  };

  const validateDhcpDns = () => {
    const startOctet = parseInt(rangeStartLastOctet, 10);
    const endOctet = parseInt(rangeEndLastOctet, 10);
  
    return (
      (!dhcpDnsConfig.dhcpEnabled ||
        (isValidLastOctet(rangeStartLastOctet) &&
          isValidLastOctet(rangeEndLastOctet) &&
          endOctet >= startOctet)) && // Ensure end range >= start range
      (!dhcpDnsConfig.primaryDns || isValidIP(dhcpDnsConfig.primaryDns)) &&
      (!dhcpDnsConfig.secondaryDns || isValidIP(dhcpDnsConfig.secondaryDns)) &&
      dhcpDnsConfig.leaseTime.trim() !== '' && // Ensure lease time is not empty
      ['server', 'relay', 'disabled'].includes(dhcpDnsConfig.dhcpv6) && // Validate dhcpv6 mode
      ['server', 'relay', 'disabled'].includes(dhcpDnsConfig.ra) // Validate RA mode
    );
  };

  const [subnet, setSubnet] = useState("192.168.1"); // Example subnet
  const [rangeStartLastOctet, setRangeStartLastOctet] = useState("100");
  const [rangeEndLastOctet, setRangeEndLastOctet] = useState("150");
  const [dhcpv6, setDhcpv6] = useState("server");
  const [ra, setRa] = useState("server");
  const [raSlaac, setRaSlaac] = useState(false);
  const [primaryDns, setPrimaryDns] = useState("");
  const [secondaryDns, setSecondaryDns] = useState("");

  // Populate initial values from the backend
  useEffect(() => {
    if (dhcpDnsConfig) {
      const subnetParts = dhcpDnsConfig.rangeStart.split(".");
      const subnetPrefix = subnetParts.slice(0, 3).join("."); // Join the first three octets
      const startLastOctet = subnetParts[3]; // Extract the last octet
      const endLastOctet = dhcpDnsConfig.rangeEnd.split(".")[3]; // Extract the last octet of rangeEnd
  
      setSubnet(subnetPrefix); // Set the read-only subnet
      setRangeStartLastOctet(startLastOctet); // Set the editable last octet
      setRangeEndLastOctet(endLastOctet); // Set the editable last octet
      setDhcpv6(dhcpDnsConfig.dhcpv6);
      setRa(dhcpDnsConfig.ra);
      setRaSlaac(dhcpDnsConfig.raSlaac);
      setPrimaryDns(dhcpDnsConfig.primaryDns || "");
      setSecondaryDns(dhcpDnsConfig.secondaryDns || "");
  
    }
  }, [dhcpDnsConfig]);

  const handleSave = () => {
    const rangeStart = `${subnet}.${rangeStartLastOctet}`;
    const rangeEnd = `${subnet}.${rangeEndLastOctet}`;

    if (!isValidLastOctet(rangeStartLastOctet) || !isValidLastOctet(rangeEndLastOctet)) {
      alert("Invalid IP range. Please ensure the last octet is between 0 and 255.");
      return;
    }

    const startOctet = parseInt(rangeStartLastOctet, 10);
    const endOctet = parseInt(rangeEndLastOctet, 10);

    if (endOctet < startOctet) {
      alert("End range must be greater than or equal to the start range.");
      return;
    }

    const limit = endOctet - startOctet + 1; // Calculate the limit

    const updatedConfig = {
      ...dhcpDnsConfig,
      rangeStart,
      rangeEnd,
      limit, // Include the calculated limit
      dhcpv6,
      ra,
      raSlaac,
      primaryDns,
      secondaryDns, 
    };

    try {
      dhcpDnsMutation.mutate(updatedConfig);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update configuration",
        variant: "destructive",
      });
    }
  };



  // Update state when query data changes
  useEffect(() => {
    if (wirelessData) {
      console.log("Wireless data received:", wirelessData);
      setWirelessConfig({
        ...wirelessData,
        band: wirelessData.band || '2.4g' // Ensure band is properly set from backend data
      });
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
        primaryDns: dhcpDnsData.primaryDns ?? '',
        secondaryDns: dhcpDnsData.secondaryDns ?? '',
      });
    }
  }, [dhcpDnsData]);

  useEffect(() => {
    if (networkData && networkData.interfaces) {
      const newConfig = {};
      networkData.interfaces.forEach((iface) => {
        newConfig[iface.id] = { gateway: iface.gateway || "" };
      });
      setInterfaceConfig(newConfig);
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



  // Function to get channel options based on band
  const getChannelOptions = (band: string) => {
    if (band === '5g') {
      return [
        { value: 'Auto', label: 'Auto Channel' },
        { value: '36', label: '36' },
        { value: '40', label: '40' },
        { value: '44', label: '44' },
        { value: '48', label: '48' },
      ];
    } else {
      // Default to 2.4GHz
      return [
        { value: 'Auto', label: 'Auto Channel' },
        { value: '1', label: '1' },
        { value: '6', label: '6 (Recommended)' },
        { value: '11', label: '11' },
      ];
    }
  };



  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Network Configuration</h1>
        {!isGatewayOnline && (
          <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
            <WifiOff className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Offline Mode - Changes will be applied when gateway is online</span>
          </div>
        )}
      </div>

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
                      <Input 
                        id={`status-${iface.id}`} 
                        value={iface.status} 
                        disabled 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`mac-${iface.id}`}>MAC Address</Label>
                      <Input id={`mac-${iface.id}`} value={iface.macAddress} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`netmask-${iface.id}`}>Netmask</Label>
                      <Input id={`netmask-${iface.id}`} value={iface.netmask} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`gateway-${iface.id}`}>Gateway</Label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-grow-0 flex-shrink-0">
                          <Input 
                            value="192.168." 
                            disabled 
                            className="w-24 bg-gray-100"
                          />
                        </div>
                        <div className="flex-grow">
                          <Input
                            id={`gateway-${iface.id}`}
                            value={interfaceConfig[iface.id]?.gateway.replace(/^192\.168\./, '') || ""}
                            onChange={(e) => {
                              const lastOctets = e.target.value;
                              setInterfaceConfig({
                                ...interfaceConfig,
                                [iface.id]: { 
                                  ...interfaceConfig[iface.id],
                                  gateway: `192.168.${lastOctets}` 
                                }
                              });
                            }}
                            placeholder="1.1"
                          />
                        </div>
                      </div>
                      {interfaceConfig[iface.id]?.gateway && !isValidIP(interfaceConfig[iface.id].gateway) && (
                        <p className="text-red-500 text-xs">Invalid gateway</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      className="custom-button"
                      onClick={() =>
                        interfaceMutation.mutate({
                          id: iface.id,
                          data: { gateway: interfaceConfig[iface.id]?.gateway || "" },
                        })
                      }
                      disabled={!validateInterface(interfaceConfig[iface.id] || { gateway: "" }) || interfaceMutation.isPending}
                    >
                      {interfaceMutation.isPending ? "Saving..." : "Save Gateway"}
                    </Button>
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
                  {/* SSID */}
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

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        value={wirelessConfig.password}
                        onChange={(e) => setWirelessConfig({ ...wirelessConfig, password: e.target.value })}
                        disabled={wirelessConfig.encryption === "None"}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                        disabled={wirelessConfig.encryption === "None"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {wirelessConfig.encryption !== "None" &&
                      !isValidPassword(wirelessConfig.password) &&
                      wirelessConfig.password && (
                        <p className="text-red-500 text-xs">Password must be 8-63 characters</p>
                      )}
                  </div>

                  {/* Band */}
                  <div className="space-y-2">
                    <Label htmlFor="band">Frequency Band</Label>
                    <Select
                      value={wirelessConfig.band || '2.4g'}
                      onValueChange={(value) => setWirelessConfig({ ...wirelessConfig, band: value })}
                    >
                      <SelectTrigger id="band">
                        <SelectValue placeholder="Select band" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2.4g">2.4 GHz</SelectItem>
                        <SelectItem value="5g">5 GHz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Channel */}
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
                        {getChannelOptions(wirelessConfig.band || '2.4g').map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Encryption */}
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
                        <SelectItem value="psk2">WPA2-PSK</SelectItem>
                        <SelectItem value="psk">WPA-PSK</SelectItem>
                        <SelectItem value="wpa2">WPA2</SelectItem>
                        <SelectItem value="wpa3">WPA3</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Enable Wireless */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="wireless-enabled"
                    className="custom-switch"
                    checked={wirelessConfig.enabled}
                    onCheckedChange={(checked) => setWirelessConfig({ ...wirelessConfig, enabled: checked })}
                  />
                  <Label htmlFor="wireless-enabled">Enable Wireless</Label>
                </div>

                {/* Save Button */}
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
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">{subnet}.</span> {/* Read-only subnet */}
                        <Input
                          id="range-start"
                          type="number"
                          min="0"
                          max="255"
                          placeholder="100"
                          value={rangeStartLastOctet}
                          onChange={(e) => setRangeStartLastOctet(e.target.value)}
                          disabled={!dhcpDnsConfig.dhcpEnabled}
                        />
                      </div>
                      {dhcpDnsConfig.dhcpEnabled &&
                        (!isValidLastOctet(rangeStartLastOctet) || rangeStartLastOctet === "") && (
                          <p className="text-red-500 text-xs">Invalid last octet (must be 0-255)</p>
                        )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="range-end">End IP Range</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">{subnet}.</span> {/* Read-only subnet */}
                        <Input
                          id="range-end"
                          type="number"
                          min="0"
                          max="255"
                          placeholder="150"
                          value={rangeEndLastOctet}
                          onChange={(e) => setRangeEndLastOctet(e.target.value)}
                          disabled={!dhcpDnsConfig.dhcpEnabled}
                        />
                      </div>
                      {dhcpDnsConfig.dhcpEnabled &&
                        (!isValidLastOctet(rangeEndLastOctet) || rangeEndLastOctet === "") && (
                          <p className="text-red-500 text-xs">Invalid last octet (must be 0-255)</p>
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
                  onClick={handleSave}
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




































