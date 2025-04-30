import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Network, Shield, Activity, Search } from 'lucide-react';

interface SystemOverview {
  systemHealth: 'stable' | 'warning' | 'critical';
  activeInterfaces: number;
  firewallStatus: boolean;
  criticalAlerts: number;
  recentPerformance: { latency: number; throughput: number };
  packetCaptures: number;
}

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        // Simulated API call for high-level system overview
        const mockOverview: SystemOverview = {
          systemHealth: 'stable',
          activeInterfaces: 2,
          firewallStatus: true,
          criticalAlerts: 0,
          recentPerformance: { latency: 12.3, throughput: 420 },
          packetCaptures: 4,
        };
        setOverview(mockOverview);
      } catch (error) {
        console.error('Error fetching overview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'stable':
        return <CheckCircle className="text-green-500" />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Network Monitoring Dashboard</h1>

      {isLoading ? (
        <div className="text-center text-gray-600">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center">
            <div className="mr-4">{getHealthIcon(overview?.systemHealth || 'stable')}</div>
            <div>
              <h2 className="text-xl font-semibold">System Health</h2>
              <p className="text-lg capitalize">{overview?.systemHealth}</p>
              <p className="text-sm text-gray-600">{overview?.criticalAlerts} critical alerts</p>
              <Link to="/network-performance" className="text-blue-600 hover:underline">
                Check Status
              </Link>
            </div>
          </div>

          {/* Network Interfaces */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center">
            <Network className="text-blue-500 mr-4" />
            <div>
              <h2 className="text-xl font-semibold">Interfaces</h2>
              <p className="text-lg">{overview?.activeInterfaces} active</p>
              <Link to="/network-config/interfaces" className="text-blue-600 hover:underline">
                Manage Interfaces
              </Link>
            </div>
          </div>

          {/* Firewall Status */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center">
            <Shield className="text-green-500 mr-4" />
            <div>
              <h2 className="text-xl font-semibold">Firewall</h2>
              <p className="text-lg">{overview?.firewallStatus ? 'Active' : 'Inactive'}</p>
              <Link to="/firewall-rules" className="text-blue-600 hover:underline">
                View Rules
              </Link>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center">
            <Activity className="text-purple-500 mr-4" />
            <div>
              <h2 className="text-xl font-semibold">Performance</h2>
              <p className="text-sm text-gray-600">
                Latency: {overview?.recentPerformance.latency.toFixed(1)} ms | Throughput:{' '}
                {overview?.recentPerformance.throughput.toFixed(0)} Mbps
              </p>
              <Link to="/network-performance" className="text-blue-600 hover:underline">
                Test Performance
              </Link>
            </div>
          </div>

          {/* Packet Analyzer */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center">
            <Search className="text-orange-500 mr-4" />
            <div>
              <h2 className="text-xl font-semibold">Packet Analyzer</h2>
              <p className="text-lg">{overview?.packetCaptures} recent captures</p>
              <Link to="/packet-analyzer" className="text-blue-600 hover:underline">
                Analyze Packets
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-4 rounded-lg shadow col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/network-config/interfaces"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Configure Interfaces
              </Link>
              <Link
                to="/firewall-rules"
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Manage Firewall
              </Link>
              <Link
                to="/network-performance/test"
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Run Performance Test
              </Link>
              <Link
                to="/packet-analyzer"
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Start Packet Capture
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;