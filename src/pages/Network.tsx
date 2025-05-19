import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/network-api";
import { Network as NetworkIcon, Wifi, Database, WifiOff, Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";
import { NetworkData, WirelessConfig, DhcpDnsConfig } from "@/types/network";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { savePendingConfig, getPendingConfigs } from "@/lib/offline-config";
import { SyncManager } from "@/components/SyncManager";
import { getGatewayStatus, subscribeToStatusChanges } from "@/lib/status-checker";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "@/styles/Network.css";

// Utility functions
function isValidIP(ip: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) &&
    ip.split('.').every((octet) => {
      const num = Number(octet);
      return num >= 0 && num <= 255;
    });
}

const isValidLastOctet = (octet: string): boolean => {
  const num = parseInt(octet, 10);
  return !isNaN(num) && num >= 0 && num <= 255;
};

export default function Network() {
  const queryClient = useQueryClient();
  const FAILURE_THRESHOLD = 3;
  const navigate = useNavigate();
  const [isGatewayOnline, setIsGatewayOnline] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const checkPendingConfigs = useCallback(() => {
    const pendingConfigs = getPendingConfigs();
    const networkRelatedConfigs = pendingConfigs.filter(config =>
      config.endpoint.includes('network.cgi') ||
      config.endpoint.includes('wireless.cgi') ||
      config.endpoint.includes('dhcp_dns.cgi')
    );
    setHasPendingChanges(networkRelatedConfigs.length > 0);
    return networkRelatedConfigs.length > 0;
  }, []);

  useEffect(() => {
    const { online } = getGatewayStatus();
    setIsGatewayOnline(online);
    checkPendingConfigs();
    const unsubscribe = subscribeToStatusChanges((online) => {
      const wasOffline = !isGatewayOnline;
      setIsGatewayOnline(online);
      if (online && wasOffline && checkPendingConfigs()) {
        console.log("Gateway came back online with pending network changes, auto-syncing...");
        if (window.syncPendingConfigs) {
          window.syncPendingConfigs().then(result => {
            console.log("Auto-sync completed:", result);
            queryClient.invalidateQueries({ queryKey: ["network"] });
          });
        }
      }
    });
    return () => unsubscribe();
  }, [isGatewayOnline, checkPendingConfigs, queryClient]);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const mergePendingChanges = useCallback((cachedData: NetworkData | WirelessConfig | DhcpDnsConfig, pendingConfigs: {endpoint: string; method: string; data: Record<string, unknown>}[]) => {
    if (!pendingConfigs || pendingConfigs.length === 0) return cachedData;
    const result = JSON.parse(JSON.stringify(cachedData));
    for (const config of pendingConfigs) {
      if (config.endpoint.includes('wireless.cgi') && config.method === 'POST') {
        Object.assign(result, config.data);
      } else if (config.endpoint.includes('dhcp_dns.cgi') && config.method === 'POST') {
        Object.assign(result, config.data);
      } else if (config.endpoint.includes('network.cgi') && config.method === 'POST') {
        if (result.interfaces && Array.isArray(result.interfaces)) {
          const interfaceId = config.data.interface as string;
          const interfaceIndex = result.interfaces.findIndex((iface: {id: string}) => iface.id === interfaceId);
          if (interfaceIndex >= 0) {
            result.interfaces[interfaceIndex] = {
              ...result.interfaces[interfaceIndex],
              ...config.data
            };
          }
        }
      }
    }
    return result;
  }, []);

  const { data: networkData, isLoading: isLoadingInterfaces, error: interfacesError } = useQuery<NetworkData>({
    queryKey: ["network", "interfaces"],
    queryFn: async () => {
      try {
        const data = await apiClient.getInterfaces();
        setConsecutiveFailures(0);
        setIsGatewayOnline(true);
        localStorage.setItem("networkInterfaces", JSON.stringify(data));
        return data;
      } catch (error) {
        setConsecutiveFailures((prev: number) => {
          const newCount = prev + 1;
          if (newCount >= FAILURE_THRESHOLD) setIsGatewayOnline(false);
          return newCount;
        });
        const cachedData = localStorage.getItem("networkInterfaces");
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const pendingConfigs = getPendingConfigs().filter(config => config.endpoint.includes('network.cgi'));
          return mergePendingChanges(parsedData, pendingConfigs as {endpoint: string; method: string; data: Record<string, unknown>}[]);
        }
        throw error;
      }
      },
    retry: 1,
    retryDelay: 3000,
  });

  const { data: wirelessData, isLoading: isLoadingWireless, error: wirelessError } = useQuery({
    queryKey: ["network", "wireless"],
    queryFn: async () => {
      try {
        const data = await apiClient.getWireless();
        setConsecutiveFailures(0);
        setIsGatewayOnline(true);
        localStorage.setItem("wirelessConfig", JSON.stringify(data));
        return data;
      } catch (error) {
        setConsecutiveFailures((prev: number) => {
          const newCount = prev + 1;
          if (newCount >= FAILURE_THRESHOLD) setIsGatewayOnline(false);
          return newCount;
        });
        const cachedData = localStorage.getItem("wirelessConfig");
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const pendingConfigs = getPendingConfigs().filter(config => config.endpoint.includes('wireless.cgi'));
          return mergePendingChanges(parsedData, pendingConfigs as {endpoint: string; method: string; data: Record<string, unknown>}[]);
        }
        throw error;
      }
    },
    retry: 1,
    retryDelay: 3000,
  });

  const { data: dhcpDnsData, isLoading: isLoadingDhcpDns, error: dhcpDnsError } = useQuery<DhcpDnsConfig>({
    queryKey: ["network", "dhcp-dns"],
    queryFn: async () => {
      try {
        const data = await apiClient.getDhcpDns();
        setConsecutiveFailures(0);
        setIsGatewayOnline(true);
        localStorage.setItem("dhcpDnsConfig", JSON.stringify(data));
        return data;
      } catch (error) {
        setConsecutiveFailures((prev: number) => {
          const newCount = prev + 1;
          if (newCount >= FAILURE_THRESHOLD) setIsGatewayOnline(false);
          return newCount;
        });
        const cachedData = localStorage.getItem("dhcpDnsConfig");
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const pendingConfigs = getPendingConfigs().filter(config => config.endpoint.includes('dhcp_dns.cgi'));
          return mergePendingChanges(parsedData, pendingConfigs as {endpoint: string; method: string; data: Record<string, unknown>}[]);
        }
        throw error;
      }
      },
    retry: 1,
    retryDelay: 3000,
  });

  const [interfaceConfig, setInterfaceConfig] = useState<{ [key: string]: { gateway: string } }>({});
  const [wirelessConfig, setWirelessConfig] = useState<WirelessConfig & { band?: string }>({
    ssid: '',
    password: '',
    channel: 'Auto',
    encryption: 'WPA2',
    enabled: false,
    band: '2.4g',
  });
  const [dhcpDnsConfig, setDhcpDnsConfig] = useState<DhcpDnsConfig>({
    dhcpEnabled: false,
    rangeStart: '',
    rangeEnd: '',
    leaseTime: '3600',
    dhcpv6: 'server',
    ra: 'server',
    raSlaac: false,
    primaryDns: '',
    secondaryDns: '',
  });
  const [subnet, setSubnet] = useState("192.168.1");
  const [rangeStartLastOctet, setRangeStartLastOctet] = useState("100");
  const [rangeEndLastOctet, setRangeEndLastOctet] = useState("150");

  useEffect(() => {
    if (wirelessData) {
      const data = wirelessData.data || wirelessData;
      setWirelessConfig({
        ssid: data.ssid || '',
        password: data.password || '',
        channel: data.channel || 'Auto',
        encryption: data.encryption || 'psk2',
        enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
        band: data.band || '2.4g'
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
      const subnetParts = dhcpDnsData.rangeStart.split(".");
      const subnetPrefix = subnetParts.slice(0, 3).join(".");
      const startLastOctet = subnetParts[3] || "100";
      const endLastOctet = dhcpDnsData.rangeEnd.split(".")[3] || "150";
      setSubnet(subnetPrefix);
      setRangeStartLastOctet(startLastOctet);
      setRangeEndLastOctet(endLastOctet);
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

  useEffect(() => {
    if (wirelessConfig.band === '5g' && !['Auto', '36', '40', '44', '48'].includes(wirelessConfig.channel)) {
      setWirelessConfig({ ...wirelessConfig, channel: 'Auto' });
    } else if (wirelessConfig.band === '2.4g' && !['Auto', '1', '6', '11'].includes(wirelessConfig.channel)) {
      setWirelessConfig({ ...wirelessConfig, channel: 'Auto' });
    }
  }, [wirelessConfig, wirelessConfig.band]);

  const interfaceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { gateway: string } }) => {
      const { online } = getGatewayStatus();
      if (!online) {
        savePendingConfig(`network.cgi?interface=${id}`, "POST", { interface: id, gateway: data.gateway });
        return { status: "pending", message: "Configuration saved and will be applied when the gateway is online" };
      }
      const response = await apiClient.updateInterface(id, { gateway: data.gateway });
      return response;
    },
    onSuccess: (response) => {
      toast({ title: response.status === "success" ? "Success" : "Pending", description: response.message });
      if (response.status === "pending") {
        setHasPendingChanges(true);
        const { online } = getGatewayStatus();
        if (online && window.syncPendingConfigs) {
          window.syncPendingConfigs().then(result => {
            if (result.success > 0) queryClient.invalidateQueries({ queryKey: ["network"] });
          });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["network", "interfaces"] });
      }
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update interface", variant: "destructive" });
    },
  });

  const wirelessMutation = useMutation({
    mutationFn: async (config: WirelessConfig) => {
      const { online } = getGatewayStatus();
      if (!online) {
        savePendingConfig("wireless.cgi", "POST", config);
        return { status: "pending", message: "Wireless configuration saved and will be applied when the gateway is online" };
      }
      const response = await apiClient.updateWireless(config);
      return response;
    },
    onSuccess: (response) => {
      toast({ title: response.status === "success" ? "Success" : "Pending", description: response.message });
      if (response.status === "pending") {
        setHasPendingChanges(true);
        const { online } = getGatewayStatus();
        if (online && window.syncPendingConfigs) {
          window.syncPendingConfigs().then(result => {
            if (result.success > 0) queryClient.invalidateQueries({ queryKey: ["network"] });
          });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["network", "wireless"] });
      }
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update wireless configuration", variant: "destructive" });
    },
  });

  const dhcpDnsMutation = useMutation({
    mutationFn: async (config: DhcpDnsConfig) => {
      const { online } = getGatewayStatus();
      if (!online) {
        savePendingConfig("dhcp_dns.cgi", "POST", config);
        return { status: "pending", message: "DHCP & DNS configuration saved and will be applied when the gateway is online" };
      }
      await apiClient.updateDhcpDns(config);
      return { status: "success", message: "DHCP & DNS configuration updated successfully" };
    },
    onSuccess: (response) => {
      toast({ title: response.status === "success" ? "Success" : "Pending", description: response.message });
      if (response.status === "pending") {
        setHasPendingChanges(true);
        const { online } = getGatewayStatus();
        if (online && window.syncPendingConfigs) {
          window.syncPendingConfigs().then(result => {
            if (result.success > 0) queryClient.invalidateQueries({ queryKey: ["network"] });
          });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["network", "dhcp-dns"] });
      }
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update DHCP & DNS configuration", variant: "destructive" });
    },
  });

  const validateInterface = (data: { gateway: string }) => data.gateway && isValidIP(data.gateway);

  const isValidSSID = (ssid: string) => ssid && ssid.trim() !== "" && ssid.length <= 32;

  const isValidPassword = (password: string | undefined | null): boolean => {
    if (password === null || password === undefined || password === '') return false;
    return password.length >= 8 && password.length <= 63;
  };

  const validateWireless = () => {
    if (!isValidSSID(wirelessConfig.ssid)) return false;
    if (wirelessConfig.encryption !== "none" && !isValidPassword(wirelessConfig.password)) return false;
    return true;
  };

  const validateDhcpDns = () => {
    const startOctet = parseInt(rangeStartLastOctet, 10);
    const endOctet = parseInt(rangeEndLastOctet, 10);
    return (
      (!dhcpDnsConfig.dhcpEnabled ||
        (isValidLastOctet(rangeStartLastOctet) &&
          isValidLastOctet(rangeEndLastOctet) &&
          endOctet >= startOctet)) &&
      (!dhcpDnsConfig.primaryDns || isValidIP(dhcpDnsConfig.primaryDns)) &&
      (!dhcpDnsConfig.secondaryDns || isValidIP(dhcpDnsConfig.secondaryDns)) &&
      dhcpDnsConfig.leaseTime.trim() !== '' &&
      ['server', 'relay', 'disabled'].includes(dhcpDnsConfig.dhcpv6) &&
      ['server', 'relay', 'disabled'].includes(dhcpDnsConfig.ra)
    );
  };

  const handleSaveDhcpDns = () => {
    const rangeStart = `${subnet}.${rangeStartLastOctet}`;
    const rangeEnd = `${subnet}.${rangeEndLastOctet}`;
    if (!isValidLastOctet(rangeStartLastOctet) || !isValidLastOctet(rangeEndLastOctet)) {
      toast({ title: "Error", description: "Invalid IP range. Last octet must be between 0 and 255.", variant: "destructive" });
      return;
    }
    const startOctet = parseInt(rangeStartLastOctet, 10);
    const endOctet = parseInt(rangeEndLastOctet, 10);
    if (endOctet < startOctet) {
      toast({ title: "Error", description: "End range must be greater than or equal to start range.", variant: "destructive" });
      return;
    }
    const limit = endOctet - startOctet + 1;
    const updatedConfig = {
      ...dhcpDnsConfig,
      rangeStart,
      rangeEnd,
      limit,
      dhcpv6: dhcpDnsConfig.dhcpv6,
      ra: dhcpDnsConfig.ra,
      raSlaac: dhcpDnsConfig.raSlaac,
      primaryDns: dhcpDnsConfig.primaryDns,
      secondaryDns: dhcpDnsConfig.secondaryDns,
    };
    dhcpDnsMutation.mutate(updatedConfig);
  };

  const getChannelOptions = (band: string) => {
    if (band === '5g') {
      return [
        { value: 'Auto', label: 'Auto Channel' },
        { value: '36', label: '36' },
        { value: '40', label: '40' },
        { value: '44', label: '44' },
        { value: '48', label: '48' },
      ];
    }
    return [
      { value: 'Auto', label: 'Auto Channel' },
      { value: '1', label: '1' },
      { value: '6', label: '6 (Recommended)' },
      { value: '11', label: '11' },
    ];
  };

  if (isLoadingInterfaces || isLoadingWireless || isLoadingDhcpDns) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card key={`skeleton-${index}`} className="shadow-lg">
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (interfacesError || wirelessError || dhcpDnsError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Failed to load network data: {interfacesError?.message || wirelessError?.message || dhcpDnsError?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!networkData || !networkData.interfaces || !wirelessData || !dhcpDnsData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <NetworkIcon className="h-5 w-5 text-gray-500 mr-2" />
              No Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 flex items-center">
              <NetworkIcon className="h-6 w-6 text-gray-500 mr-2" />
              No network configuration data available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <SyncManager
        autoSync={true}
        onSyncComplete={(result) => {
          if (result.success > 0) {
            queryClient.invalidateQueries({ queryKey: ["network"] });
            toast({
              title: "Sync Complete",
              description: `Successfully applied ${result.success} network configurations.${
                result.failed > 0 ? ` Failed to apply ${result.failed} configurations.` : ''
              }`,
            });
          }
        }}
      />
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
              <NetworkIcon className="h-6 w-6 text-[#1BA3DD] mr-2" />
              Network Configuration
            </CardTitle>
            {!isGatewayOnline && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                      <WifiOff className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Offline Mode</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Changes will be applied when the gateway is online</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
      </Card>
      <Tabs defaultValue="interfaces" className="space-y-4">
        <TabsList className="bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="interfaces" className="flex items-center gap-2 custom-tab">
            <NetworkIcon className="h-4 w-4 text-[#1BA3DD]" />
            Interfaces
          </TabsTrigger>
          <TabsTrigger value="wireless" className="flex items-center gap-2 custom-tab">
            <Wifi className="h-4 w-4 text-[#1BA3DD]" />
            Wireless
          </TabsTrigger>
          <TabsTrigger value="dhcp-dns" className="flex items-center gap-2 custom-tab">
            <Database className="h-4 w-4 text-[#1BA3DD]" />
            DHCP & DNS
          </TabsTrigger>
        </TabsList>
        <TabsContent value="interfaces" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {networkData.interfaces.map((iface) => (
              <Card key={iface.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                    <NetworkIcon className="h-5 w-5 text-[#1BA3DD] mr-2" />
                    {iface.name}
                  </CardTitle>
                  <CardDescription>Configure network interface settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`status-${iface.id}`} className="text-sm font-medium text-gray-600">Status</Label>
                      <Input id={`status-${iface.id}`} value={iface.status} disabled className="bg-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`mac-${iface.id}`} className="text-sm font-medium text-gray-600">MAC Address</Label>
                      <Input id={`mac-${iface.id}`} value={iface.macAddress} disabled className="bg-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`netmask-${iface.id}`} className="text-sm font-medium text-gray-600">Netmask</Label>
                      <Input id={`netmask-${iface.id}`} value={iface.netmask} disabled className="bg-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`gateway-${iface.id}`} className="text-sm font-medium text-gray-600">Gateway</Label>
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input value="192.168." disabled className="w-24 bg-gray-100" />
                            </TooltipTrigger>
                            <TooltipContent>Fixed subnet prefix</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input
                                id={`gateway-${iface.id}`}
                                value={interfaceConfig[iface.id]?.gateway.replace(/^192\.168\./, '') || ""}
                                onChange={(e) => {
                                  const lastOctets = e.target.value;
                                  setInterfaceConfig({
                                    ...interfaceConfig,
                                    [iface.id]: { ...interfaceConfig[iface.id], gateway: `192.168.${lastOctets}` }
                                  });
                                }}
                                placeholder="1.1"
                                aria-label="Gateway last octets"
                              />
                            </TooltipTrigger>
                            <TooltipContent>Enter the last two octets of the gateway IP</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {interfaceConfig[iface.id]?.gateway && !isValidIP(interfaceConfig[iface.id].gateway) && (
                        <p className="text-red-500 text-xs">Invalid gateway IP address</p>
                      )}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            className="custom-button"
                            onClick={() => interfaceMutation.mutate({ id: iface.id, data: { gateway: interfaceConfig[iface.id]?.gateway || "" } })}
                            disabled={!validateInterface(interfaceConfig[iface.id] || { gateway: "" }) || interfaceMutation.isPending}
                            aria-label="Save gateway configuration"
                          >
                            {interfaceMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              "Save Gateway"
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save gateway configuration</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="wireless">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Wifi className="h-5 w-5 text-[#1BA3DD] mr-2" />
                Wireless Networks
              </CardTitle>
              <CardDescription>Configure wireless network settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ssid" className="text-sm font-medium text-gray-600">SSID</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            id="ssid"
                            placeholder="MyWiFi"
                            value={wirelessConfig.ssid}
                            onChange={(e) => setWirelessConfig({ ...wirelessConfig, ssid: e.target.value })}
                            aria-label="Wireless SSID"
                          />
                        </TooltipTrigger>
                        <TooltipContent>Enter the wireless network name (1-32 characters)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {!isValidSSID(wirelessConfig.ssid) && wirelessConfig.ssid && (
                      <p className="text-red-500 text-xs">SSID must be 1-32 characters</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-600">Password</Label>
                    <div className="relative">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="********"
                              value={wirelessConfig.password}
                              onChange={(e) => setWirelessConfig({ ...wirelessConfig, password: e.target.value })}
                              disabled={wirelessConfig.encryption === "none"}
                              aria-label="Wireless password"
                            />
                          </TooltipTrigger>
                          <TooltipContent>Enter the wireless password (8-63 characters)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={togglePasswordVisibility}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              disabled={wirelessConfig.encryption === "none"}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{showPassword ? "Hide password" : "Show password"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {wirelessConfig.encryption !== "none" && !isValidPassword(wirelessConfig.password) && wirelessConfig.password && (
                      <p className="text-red-500 text-xs">Password must be 8-63 characters</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="band" className="text-sm font-medium text-gray-600">Frequency Band</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select
                            value={wirelessConfig.band || '2.4g'}
                            onValueChange={(value) => setWirelessConfig({ ...wirelessConfig, band: value })}
                          >
                            <SelectTrigger id="band" className="border-gray-300">
                              <SelectValue placeholder="Select band" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2.4g">2.4 GHz</SelectItem>
                              <SelectItem value="5g">5 GHz</SelectItem>
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent>Select wireless frequency band</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel" className="text-sm font-medium text-gray-600">Channel</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select
                            value={wirelessConfig.channel}
                            onValueChange={(value) => setWirelessConfig({ ...wirelessConfig, channel: value })}
                          >
                            <SelectTrigger id="channel" className="border-gray-300">
                              <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                            <SelectContent>
                              {getChannelOptions(wirelessConfig.band || '2.4g').map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent>Select wireless channel</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="encryption" className="text-sm font-medium text-gray-600">Encryption</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select
                            value={wirelessConfig.encryption}
                            onValueChange={(value) => setWirelessConfig({ ...wirelessConfig, encryption: value })}
                          >
                            <SelectTrigger id="encryption" className="border-gray-300">
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
                        </TooltipTrigger>
                        <TooltipContent>Select encryption protocol</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Switch
                          id="wireless-enabled"
                          className="custom-switch"
                          checked={wirelessConfig.enabled}
                          onCheckedChange={(checked) => setWirelessConfig({ ...wirelessConfig, enabled: checked })}
                          aria-label="Enable wireless network"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Enable or disable wireless network</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Label htmlFor="wireless-enabled" className="text-sm font-medium text-gray-600">Enable Wireless</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        className="custom-button"
                        onClick={() => wirelessMutation.mutate(wirelessConfig)}
                        disabled={!validateWireless() || wirelessMutation.isPending}
                        aria-label="Save wireless configuration"
                      >
                        {wirelessMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          "Save Wireless Config"
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save wireless configuration</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="dhcp-dns">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Database className="h-5 w-5 text-[#1BA3DD] mr-2" />
                DHCP & DNS Settings
              </CardTitle>
              <CardDescription>Configure DHCP server and DNS settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <NetworkIcon className="h-5 w-5 text-[#1BA3DD] mr-2" />
                    DHCP Settings
                  </h3>
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Switch
                            id="dhcp-enabled"
                            className="custom-switch"
                            checked={dhcpDnsConfig.dhcpEnabled}
                            onCheckedChange={(checked) => setDhcpDnsConfig({ ...dhcpDnsConfig, dhcpEnabled: checked })}
                            aria-label="Enable DHCP server"
                          />
                        </TooltipTrigger>
                        <TooltipContent>Enable or disable DHCP server</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Label htmlFor="dhcp-enabled" className="text-sm font-medium text-gray-600">Enable DHCP Server</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="range-start" className="text-sm font-medium text-gray-600">Start IP Range</Label>
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-gray-500 bg-gray-100 px-2 py-2 rounded-md">{subnet}.</span>
                            </TooltipTrigger>
                            <TooltipContent>Fixed subnet prefix</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input
                                id="range-start"
                                type="number"
                                min="0"
                                max="255"
                                placeholder="100"
                                value={rangeStartLastOctet}
                                onChange={(e) => setRangeStartLastOctet(e.target.value)}
                                disabled={!dhcpDnsConfig.dhcpEnabled}
                                aria-label="DHCP start IP range last octet"
                              />
                            </TooltipTrigger>
                            <TooltipContent>Enter the last octet of the start IP range</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {dhcpDnsConfig.dhcpEnabled && (!isValidLastOctet(rangeStartLastOctet) || rangeStartLastOctet === "") && (
                        <p className="text-red-500 text-xs">Invalid last octet (must be 0-255)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="range-end" className="text-sm font-medium text-gray-600">End IP Range</Label>
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-gray-500 bg-gray-100 px-2 py-2 rounded-md">{subnet}.</span>
                            </TooltipTrigger>
                            <TooltipContent>Fixed subnet prefix</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input
                                id="range-end"
                                type="number"
                                min="0"
                                max="255"
                                placeholder="150"
                                value={rangeEndLastOctet}
                                onChange={(e) => setRangeEndLastOctet(e.target.value)}
                                disabled={!dhcpDnsConfig.dhcpEnabled}
                                aria-label="DHCP end IP range last octet"
                              />
                            </TooltipTrigger>
                            <TooltipContent>Enter the last octet of the end IP range</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {dhcpDnsConfig.dhcpEnabled && (!isValidLastOctet(rangeEndLastOctet) || rangeEndLastOctet === "") && (
                        <p className="text-red-500 text-xs">Invalid last octet (must be 0-255)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leasetime" className="text-sm font-medium text-gray-600">Lease Time</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              id="leasetime"
                              placeholder="12h"
                              value={dhcpDnsConfig.leaseTime}
                              onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, leaseTime: e.target.value })}
                              disabled={!dhcpDnsConfig.dhcpEnabled}
                              aria-label="DHCP lease time"
                            />
                          </TooltipTrigger>
                          <TooltipContent>Enter the DHCP lease time (e.g., 12h)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <NetworkIcon className="h-5 w-5 text-[#1BA3DD] mr-2" />
                    IPv6 Settings
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpv6" className="text-sm font-medium text-gray-600">DHCPv6 Mode</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select
                            value={dhcpDnsConfig.dhcpv6}
                            onValueChange={(value) => setDhcpDnsConfig({ ...dhcpDnsConfig, dhcpv6: value })}
                            disabled={!dhcpDnsConfig.dhcpEnabled}
                          >
                            <SelectTrigger id="dhcpv6" className="border-gray-300">
                              <SelectValue placeholder="Select DHCPv6 mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="server">Server</SelectItem>
                              <SelectItem value="relay">Relay</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent>Select DHCPv6 mode</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ra" className="text-sm font-medium text-gray-600">Router Advertisement Mode</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select
                            value={dhcpDnsConfig.ra}
                            onValueChange={(value) => setDhcpDnsConfig({ ...dhcpDnsConfig, ra: value })}
                            disabled={!dhcpDnsConfig.dhcpEnabled}
                          >
                            <SelectTrigger id="ra" className="border-gray-300">
                              <SelectValue placeholder="Select RA mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="server">Server</SelectItem>
                              <SelectItem value="relay">Relay</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent>Select Router Advertisement mode</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Switch
                            id="ra-slaac"
                            className="custom-switch"
                            checked={dhcpDnsConfig.raSlaac}
                            onCheckedChange={(checked) => setDhcpDnsConfig({ ...dhcpDnsConfig, raSlaac: checked })}
                            disabled={!dhcpDnsConfig.dhcpEnabled}
                            aria-label="Enable SLAAC"
                          />
                        </TooltipTrigger>
                        <TooltipContent>Enable or disable SLAAC</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Label htmlFor="ra-slaac" className="text-sm font-medium text-gray-600">Enable SLAAC</Label>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Database className="h-5 w-5 text-[#1BA3DD] mr-2" />
                    DNS Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-dns" className="text-sm font-medium text-gray-600">Primary DNS</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              id="primary-dns"
                              placeholder="8.8.8.8"
                              value={dhcpDnsConfig.primaryDns}
                              onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, primaryDns: e.target.value })}
                              aria-label="Primary DNS address"
                            />
                          </TooltipTrigger>
                          <TooltipContent>Enter the primary DNS address</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {!isValidIP(dhcpDnsConfig.primaryDns) && dhcpDnsConfig.primaryDns && (
                        <p className="text-red-500 text-xs">Invalid DNS address</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-dns" className="text-sm font-medium text-gray-600">Secondary DNS</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              id="secondary-dns"
                              placeholder="8.8.4.4"
                              value={dhcpDnsConfig.secondaryDns}
                              onChange={(e) => setDhcpDnsConfig({ ...dhcpDnsConfig, secondaryDns: e.target.value })}
                              aria-label="Secondary DNS address"
                            />
                          </TooltipTrigger>
                          <TooltipContent>Enter the secondary DNS address</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {!isValidIP(dhcpDnsConfig.secondaryDns) && dhcpDnsConfig.secondaryDns && (
                        <p className="text-red-500 text-xs">Invalid DNS address</p>
                      )}
                    </div>
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        className="custom-button"
                        onClick={handleSaveDhcpDns}
                        disabled={!validateDhcpDns() || dhcpDnsMutation.isPending}
                        aria-label="Save DHCP and DNS configuration"
                      >
                        {dhcpDnsMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          "Save DHCP & DNS Config"
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save DHCP and DNS configuration</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
