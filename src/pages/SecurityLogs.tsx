import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { securityAlertsApi } from '@/lib/security-alerts-api';
import { SecurityAlert } from '@/components/AlertsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, Wifi, ExternalLink, Clock, ArrowLeft, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function SecurityLogs() {
  const navigate = useNavigate();
  const [includeResolved, setIncludeResolved] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const queryClient = useQueryClient();
  
  // Add state to track alerts being resolved
  const [resolvingAlerts, setResolvingAlerts] = useState<Set<string>>(new Set());

  // Fetch security alerts
  const { 
    data: alerts = [], 
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['securityAlerts', includeResolved, limit],
    queryFn: () => securityAlertsApi.getAlerts(limit, includeResolved),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Function to mark an alert as resolved with optimistic updates
  const handleResolveAlert = useCallback(async (id: string) => {
    try {
      // Add to resolving set
      setResolvingAlerts(prev => new Set(prev).add(id));
      
      // Optimistic update - immediately update UI
      queryClient.setQueryData(['securityAlerts', includeResolved, limit], (oldData: SecurityAlert[] = []) => {
        return oldData.map(alert => 
          alert.id === id ? { ...alert, resolved: true } : alert
        );
      });
      
      // Make API call
      await securityAlertsApi.resolveAlert(id);
      
      // Refetch to ensure data consistency
      refetch();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      
      // Revert optimistic update on error
      queryClient.setQueryData(['securityAlerts', includeResolved, limit], (oldData: SecurityAlert[] = []) => {
        return oldData.map(alert => 
          alert.id === id ? { ...alert, resolved: false } : alert
        );
      });
    } finally {
      // Remove from resolving set
      setResolvingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [queryClient, includeResolved, limit, refetch]);

  // Fix the refresh button functionality
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Filter alerts based on user selections
  const filteredAlerts = alerts.filter(alert => {
    // Filter by type
    if (filterType !== 'all' && alert.type !== filterType) {
      return false;
    }
    
    // Filter by severity
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) {
      return false;
    }
    
    // Filter by search query (check in message, source, and details)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesMessage = alert.message.toLowerCase().includes(query);
      const matchesSource = alert.source?.toLowerCase().includes(query) || false;
      const matchesDetails = alert.details?.toLowerCase().includes(query) || false;
      
      if (!matchesMessage && !matchesSource && !matchesDetails) {
        return false;
      }
    }
    
    return true;
  });

  // Get alert icon based on type
  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'firewall':
        return <Shield className="h-5 w-5" />;
      case 'wifi':
        return <Wifi className="h-5 w-5" />;
      case 'network':
        return <ExternalLink className="h-5 w-5" />;
      case 'system':
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };
  
  // Get severity class for styling
  const getSeverityClass = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Add a function to format timestamps with client-side time correction
  const formatTimestamp = (timestamp: string): string => {
    try {
      // Parse the timestamp from the alert
      const alertTime = new Date(timestamp);
      
      // Check if the timestamp is potentially incorrect (more than 24 hours off from current time)
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - alertTime.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // If the time difference is more than 24 hours, use a relative time format
      // based on the alert's position in the list (newer alerts first)
      if (hoursDiff > 24) {
        return `${new Date().toLocaleString('en-US', { 
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }
      
      // Otherwise, use the alert's timestamp but format it with client's locale
      return alertTime.toLocaleString('en-US', { 
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      // If parsing fails, return current client time
      return new Date().toLocaleString('en-US', { 
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header with back button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Security Logs</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 mr-2 text-gray-500" />
          <h2 className="text-lg font-medium">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search in alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Type filter */}
          <div>
            <Label htmlFor="type-filter">Alert Type</Label>
            <Select 
              value={filterType} 
              onValueChange={setFilterType}
            >
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="firewall">Firewall</SelectItem>
                <SelectItem value="wifi">Wi-Fi</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Severity filter */}
          <div>
            <Label htmlFor="severity-filter">Severity</Label>
            <Select 
              value={filterSeverity} 
              onValueChange={setFilterSeverity}
            >
              <SelectTrigger id="severity-filter">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Include resolved checkbox */}
          <div className="flex items-end">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-resolved" 
                checked={includeResolved}
                onCheckedChange={(checked) => setIncludeResolved(checked === true)}
              />
              <Label htmlFor="include-resolved">Include resolved alerts</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading security alerts...</p>
          </div>
        ) : filteredAlerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityClass(alert.severity)}`}>
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6 text-gray-500">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="ml-2">
                          {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{alert.message}</div>
                      {alert.details && (
                        <div className="text-xs text-gray-500 mt-1">{alert.details}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.source || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimestamp(alert.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alert.resolved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.resolved ? 'Resolved' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!alert.resolved ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={resolvingAlerts.has(alert.id)}
                        >
                          {resolvingAlerts.has(alert.id) ? (
                            <>
                              <span className="animate-spin mr-1">⟳</span>
                              Resolving...
                            </>
                          ) : (
                            'Resolve'
                          )}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">No matching alerts found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
      
      {/* Load more button */}
      {alerts.length >= limit && (
        <div className="mt-4 text-center">
          <Button 
            variant="outline"
            onClick={() => setLimit(prev => prev + 50)}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

