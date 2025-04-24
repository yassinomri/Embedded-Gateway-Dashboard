import React, { useEffect, useState } from 'react';

// Utility functions
function isValidIP(ip: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) &&
    ip.split('.').every((octet) => {
      const num = Number(octet);
      return num >= 0 && num <= 255;
    });
}

function isValidPort(port: string) {
  const portNum = Number(port);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

// Types
type NetworkConfig = {
  ipAddress: string;
  subnetMask: string;
  gateway: string;
};

type DhcpConfig = {
  enabled: boolean;
  rangeStart: string;
  rangeEnd: string;
};

type DnsConfig = {
  primary: string;
  secondary: string;
};

type PortForwardingRule = {
  port: string;
  protocol: string;
  forwardTo: string;
};

type FirewallRule = {
  name: string;
  source: string;
  destination: string;
  action: string;
};

// Tab components moved outside Configuration
const NetworkTab = React.memo(({ networkConfig, setNetworkConfig, saveConfig, saveStatus }: {
  networkConfig: NetworkConfig;
  setNetworkConfig: React.Dispatch<React.SetStateAction<NetworkConfig>>;
  saveConfig: (key: string, config: unknown, validationFn?: () => boolean) => Promise<void>;
  saveStatus: { [key: string]: string };
}) => {
  const validateNetworkConfig = () => {
    return (
      isValidIP(networkConfig.ipAddress) && 
      isValidIP(networkConfig.subnetMask) && 
      isValidIP(networkConfig.gateway)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfig('networkConfig', networkConfig, validateNetworkConfig);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Network Configuration</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">IP Address</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              placeholder="192.168.1.1"
              value={networkConfig.ipAddress}
              onChange={(e) => setNetworkConfig({ ...networkConfig, ipAddress: e.target.value })}
              aria-label="IP Address"
            />
            {!isValidIP(networkConfig.ipAddress) && networkConfig.ipAddress && (
              <p className="text-red-500 text-xs">Invalid IP address format</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Subnet Mask</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              placeholder="255.255.255.0"
              value={networkConfig.subnetMask}
              onChange={(e) => setNetworkConfig({ ...networkConfig, subnetMask: e.target.value })}
            />
            {!isValidIP(networkConfig.subnetMask) && networkConfig.subnetMask && (
              <p className="text-red-500 text-xs">Invalid subnet mask</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Gateway</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              placeholder="192.168.1.254"
              value={networkConfig.gateway}
              onChange={(e) => setNetworkConfig({ ...networkConfig, gateway: e.target.value })}
            />
            {!isValidIP(networkConfig.gateway) && networkConfig.gateway && (
              <p className="text-red-500 text-xs">Invalid gateway address</p>
            )}
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          disabled={!validateNetworkConfig()}
        >
          Save Network Config
        </button>
        {saveStatus.networkConfig && (
          <p className={`ml-2 ${saveStatus.networkConfig.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
            {saveStatus.networkConfig}
          </p>
        )}
      </form>
    </div>
  );
});

const DhcpTab = React.memo(({ dhcpConfig, setDhcpConfig, saveConfig, saveStatus }: {
  dhcpConfig: DhcpConfig;
  setDhcpConfig: React.Dispatch<React.SetStateAction<DhcpConfig>>;
  saveConfig: (key: string, config: unknown, validationFn?: () => boolean) => Promise<void>;
  saveStatus: { [key: string]: string };
}) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">DHCP Configuration</h2>
    
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id="dhcpEnabled"
        checked={dhcpConfig.enabled}
        onChange={(e) => setDhcpConfig({ ...dhcpConfig, enabled: e.target.checked })}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor="dhcpEnabled" className="text-sm font-medium text-gray-700">
        Enable DHCP Server
      </label>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Start IP Range</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          placeholder="192.168.1.100"
          value={dhcpConfig.rangeStart}
          onChange={(e) => setDhcpConfig({ ...dhcpConfig, rangeStart: e.target.value })}
          disabled={!dhcpConfig.enabled}
        />
        {!isValidIP(dhcpConfig.rangeStart) && dhcpConfig.rangeStart && (
          <p className="text-red-500 text-xs">Invalid IP address</p>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">End IP Range</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          placeholder="192.168.1.200"
          value={dhcpConfig.rangeEnd}
          onChange={(e) => setDhcpConfig({ ...dhcpConfig, rangeEnd: e.target.value })}
          disabled={!dhcpConfig.enabled}
        />
        {!isValidIP(dhcpConfig.rangeEnd) && dhcpConfig.rangeEnd && (
          <p className="text-red-500 text-xs"> Invalid IP address</p>
        )}
      </div>
    </div>
    
    <button
      className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
      onClick={() => saveConfig('dhcpConfig', dhcpConfig)}
      disabled={dhcpConfig.enabled && (!isValidIP(dhcpConfig.rangeStart) || !isValidIP(dhcpConfig.rangeEnd))}
    >
      Save DHCP Config
    </button>
    {saveStatus.dhcpConfig && (
      <p className={`ml-2 ${saveStatus.dhcpConfig.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
        {saveStatus.dhcpConfig}
      </p>
    )}  
  </div>
));

const DnsTab = React.memo(({ dnsConfig, setDnsConfig, saveConfig, saveStatus }: {
  dnsConfig: DnsConfig;
  setDnsConfig: React.Dispatch<React.SetStateAction<DnsConfig>>;
  saveConfig: (key: string, config: unknown, validationFn?: () => boolean) => Promise<void>;
  saveStatus: { [key: string]: string };
}) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">DNS Configuration</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Primary DNS</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="8.8.8.8"
          value={dnsConfig.primary}
          onChange={(e) => setDnsConfig({ ...dnsConfig, primary: e.target.value })}
        />
        {!isValidIP(dnsConfig.primary) && dnsConfig.primary && (
          <p className="text-red-500 text-xs">Invalid DNS address</p>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Secondary DNS</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="8.8.4.4"
          value={dnsConfig.secondary}
          onChange={(e) => setDnsConfig({ ...dnsConfig, secondary: e.target.value })}
        />
        {!isValidIP(dnsConfig.secondary) && dnsConfig.secondary && (
          <p className="text-red-500 text-xs">Invalid DNS address</p>
        )}
      </div>
    </div>
    
    <button
      className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
      onClick={() => saveConfig('dnsConfig', dnsConfig)}
      disabled={
        (dnsConfig.primary && !isValidIP(dnsConfig.primary)) || 
        (dnsConfig.secondary && !isValidIP(dnsConfig.secondary))
      }
    >
      Save DNS Config
    </button>
    {saveStatus.dnsConfig && (
      <p className={`ml-2 ${saveStatus.dnsConfig.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
        {saveStatus.dnsConfig}
      </p>
    )}
  </div>
));

const PortForwardingTab = React.memo(({ portForwarding, setPortForwarding, portRules, setPortRules, saveConfig, saveStatus, validatePortForwarding, addPortForwardingRule, deletePortRule }: {
  portForwarding: PortForwardingRule;
  setPortForwarding: React.Dispatch<React.SetStateAction<PortForwardingRule>>;
  portRules: PortForwardingRule[];
  setPortRules: React.Dispatch<React.SetStateAction<PortForwardingRule[]>>;
  saveConfig: (key: string, config: unknown, validationFn?: () => boolean) => Promise<void>;
  saveStatus: { [key: string]: string };
  validatePortForwarding: () => boolean;
  addPortForwardingRule: () => void;
  deletePortRule: (index: number) => void;
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Port Forwarding</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Port</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="8080"
          value={portForwarding.port}
          onChange={(e) => setPortForwarding({ ...portForwarding, port: e.target.value })}
        />
        {!isValidPort(portForwarding.port) && portForwarding.port && (
          <p className="text-red-500 text-xs">Invalid port (1-65535)</p>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Protocol</label>
        <select
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={portForwarding.protocol}
          onChange={(e) => setPortForwarding({ ...portForwarding, protocol: e.target.value })}
        >
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
          <option value="BOTH">Both</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Forward To</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="192.168.1.100"
          value={portForwarding.forwardTo}
          onChange={(e) => setPortForwarding({ ...portForwarding, forwardTo: e.target.value })}
        />
        {!isValidIP(portForwarding.forwardTo) && portForwarding.forwardTo && (
          <p className="text-red-500 text-xs">Invalid IP address</p>
        )}
      </div>
    </div>
    
    <button
      className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
      onClick={addPortForwardingRule}
      disabled={!validatePortForwarding()}
    >
      Add Port Forwarding Rule
    </button>
    {saveStatus.portForwarding && (
      <p className={`ml-2 ${saveStatus.portForwarding.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
        {saveStatus.portForwarding}
      </p>
    )}
    
    {portRules.length > 0 && (
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold">Current Port Forwarding Rules</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forward To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portRules.map((rule, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.port}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.protocol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.forwardTo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => deletePortRule(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
));

const FirewallTab = React.memo(({ firewallRule, setFirewallRule, firewallRules, setFirewallRules, saveConfig, saveStatus, validateFirewallRule, addFirewallRule, deleteFirewallRule }: {
  firewallRule: FirewallRule;
  setFirewallRule: React.Dispatch<React.SetStateAction<FirewallRule>>;
  firewallRules: FirewallRule[];
  setFirewallRules: React.Dispatch<React.SetStateAction<FirewallRule[]>>;
  saveConfig: (key: string, config: unknown, validationFn?: () => boolean) => Promise<void>;
  saveStatus: { [key: string]: string };
  validateFirewallRule: () => boolean;
  addFirewallRule: () => void;
  deleteFirewallRule: (index: number) => void;
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Firewall Rules</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Rule Name</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Block SSH Access"
          value={firewallRule.name}
          onChange={(e) => setFirewallRule({ ...firewallRule, name: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Action</label>
        <select
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={firewallRule.action}
          onChange={(e) => setFirewallRule({ ...firewallRule, action: e.target.value })}
        >
          <option value="Block">Block</option>
          <option value="Allow">Allow</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Source IP</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="192.168.1.100 or 192.168.1.0/24"
          value={firewallRule.source}
          onChange={(e) => setFirewallRule({ ...firewallRule, source: e.target.value })}
        />
        {!isValidIP(firewallRule.source.split('/')[0]) && firewallRule.source && (
          <p className="text-red-500 text-xs">Invalid IP address or CIDR</p>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Destination IP</label>
        <input
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="192.168.1.5"
          value={firewallRule.destination}
          onChange={(e) => setFirewallRule({ ...firewallRule, destination: e.target.value })}
        />
        {!isValidIP(firewallRule.destination) && firewallRule.destination && (
          <p className="text-red-500 text-xs">Invalid IP address</p>
        )}
      </div>
    </div>
    
    <button
      className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
      onClick={addFirewallRule}
      disabled={!validateFirewallRule()}
    >
      Add Firewall Rule
    </button>
    {saveStatus.firewall && (
      <p className={`ml-2 ${saveStatus.firewall.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
        {saveStatus.firewall}
      </p>
    )}
    
    {firewallRules.length > 0 && (
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold">Current Firewall Rules</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {firewallRules.map((rule, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.destination}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      rule.action === 'Allow' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {rule.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => deleteFirewallRule(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
));

const Configuration = () => {
  // State management
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    ipAddress: '',
    subnetMask: '',
    gateway: ''
  });

  const [dhcpConfig, setDhcpConfig] = useState<DhcpConfig>({
    enabled: false,
    rangeStart: '',
    rangeEnd: ''
  });

  const [dnsConfig, setDnsConfig] = useState<DnsConfig>({
    primary: '',
    secondary: ''
  });

  const [portForwarding, setPortForwarding] = useState<PortForwardingRule>({
    port: '',
    protocol: 'TCP',
    forwardTo: ''
  });

  const [portRules, setPortRules] = useState<PortForwardingRule[]>([]);

  const [firewallRule, setFirewallRule] = useState<FirewallRule>({
    name: '',
    source: '',
    destination: '',
    action: 'Block'
  });

  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);

  const [activeTab, setActiveTab] = useState<string>('network');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: string }>({});

  // Load saved config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        
        const savedNet = localStorage.getItem('networkConfig');
        const savedDhcp = localStorage.getItem('dhcpConfig');
        const savedDns = localStorage.getItem('dnsConfig');
        const savedFw = localStorage.getItem('firewallRules');
        const savedPorts = localStorage.getItem('portForwardingRules');

        if (savedNet) setNetworkConfig(JSON.parse(savedNet));
        if (savedDhcp) setDhcpConfig(JSON.parse(savedDhcp));
        if (savedDns) setDnsConfig(JSON.parse(savedDns));
        if (savedFw) setFirewallRules(JSON.parse(savedFw));
        if (savedPorts) setPortRules(JSON.parse(savedPorts));
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save functions
  const saveConfig = async (key: string, config: unknown, validationFn?: () => boolean) => {
    try {
      if (validationFn && !validationFn()) {
        setSaveStatus({ ...saveStatus, [key]: 'Validation failed' });
        return;
      }

      localStorage.setItem(key, JSON.stringify(config));
      setSaveStatus({ ...saveStatus, [key]: 'Saved successfully!' });
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[key];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      setSaveStatus({ ...saveStatus, [key]: 'Error saving configuration' });
      console.error('Error saving config:', error);
    }
  };

  const validatePortForwarding = () => {
    return (
      isValidPort(portForwarding.port) && 
      isValidIP(portForwarding.forwardTo)
    );
  };

  const validateFirewallRule = () => {
    return (
      firewallRule.name.trim() !== '' && 
      isValidIP(firewallRule.source.split('/')[0]) && 
      isValidIP(firewallRule.destination)
    );
  };

  const addPortForwardingRule = () => {
    if (!validatePortForwarding()) {
      setSaveStatus({ ...saveStatus, portForwarding: 'Invalid port or IP address' });
      return;
    }

    const updated = [...portRules, portForwarding];
    setPortRules(updated);
    saveConfig('portForwardingRules', updated);
    setPortForwarding({ port: '', protocol: 'TCP', forwardTo: '' });
  };

  const addFirewallRule = () => {
    if (!validateFirewallRule()) {
      setSaveStatus({ ...saveStatus, firewall: 'Please fill all fields with valid IPs' });
      return;
    }

    const updated = [...firewallRules, firewallRule];
    setFirewallRules(updated);
    saveConfig('firewallRules', updated);
    setFirewallRule({ name: '', source: '', destination: '', action: 'Block' });
  };

  const deletePortRule = (index: number) => {
    const updated = portRules.filter((_, i) => i !== index);
    setPortRules(updated);
    saveConfig('portForwardingRules', updated);
  };

  const deleteFirewallRule = (index: number) => {
    const updated = firewallRules.filter((_, i) => i !== index);
    setFirewallRules(updated);
    saveConfig('firewallRules', updated);
  };

  // Main render
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Tabs Navigation */}
          <div className="flex border-b mb-6">
            {['network', 'dhcp', 'dns', 'portForwarding', 'firewall'].map((tab) => (
              <button
                key={tab}
                className={`py-2 px-4 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab 
                    ? 'border-b-2 border-blue-600 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {activeTab === 'network' && (
              <NetworkTab
                networkConfig={networkConfig}
                setNetworkConfig={setNetworkConfig}
                saveConfig={saveConfig}
                saveStatus={saveStatus}
              />
            )}
            {activeTab === 'dhcp' && (
              <DhcpTab
                dhcpConfig={dhcpConfig}
                setDhcpConfig={setDhcpConfig}
                saveConfig={saveConfig}
                saveStatus={saveStatus}
              />
            )}
            {activeTab === 'dns' && (
              <DnsTab
                dnsConfig={dnsConfig}
                setDnsConfig={setDnsConfig}
                saveConfig={saveConfig}
                saveStatus={saveStatus}
              />
            )}
            {activeTab === 'portForwarding' && (
              <PortForwardingTab
                portForwarding={portForwarding}
                setPortForwarding={setPortForwarding}
                portRules={portRules}
                setPortRules={setPortRules}
                saveConfig={saveConfig}
                saveStatus={saveStatus}
                validatePortForwarding={validatePortForwarding}
                addPortForwardingRule={addPortForwardingRule}
                deletePortRule={deletePortRule}
              />
            )}
            {activeTab === 'firewall' && (
              <FirewallTab
                firewallRule={firewallRule}
                setFirewallRule={setFirewallRule}
                firewallRules={firewallRules}
                setFirewallRules={setFirewallRules}
                saveConfig={saveConfig}
                saveStatus={saveStatus}
                validateFirewallRule={validateFirewallRule}
                addFirewallRule={addFirewallRule}
                deleteFirewallRule={deleteFirewallRule}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Configuration;