import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, Wifi, Clock, ExternalLink, Network, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

export interface SecurityAlert {
  id: string;
  type: 'firewall' | 'wifi' | 'network' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  source?: string;
  details?: string;
  resolved?: boolean;
}

interface AlertsCardProps {
  className?: string;
  alerts: SecurityAlert[];
  isLoading?: boolean;
  onResolve?: (id: string) => void;
}

export function AlertsCard({
  className,
  alerts = [],
  isLoading = false,
  onResolve
}: AlertsCardProps) {
  const navigate = useNavigate();
  
  // Add alert type icons based on the alert type
  const getAlertIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-5 w-5 text-orange-500" />;
      case 'network':
        return <Network className="h-5 w-5 text-blue-500" />;
      case 'security':
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  // Add alert type colors based on severity
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className={cn("col-span-4 w-full max-w-6xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center text-lg font-semibold">
          <AlertTriangle className="mr-2 h-5 w-5 text-red-500" /> Security Alerts
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/security-logs')}
        >
          View All Logs
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-20 bg-gray-100 animate-pulse rounded-md"></div>
            <div className="h-20 bg-gray-100 animate-pulse rounded-md"></div>
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-3 overflow-y-auto max-h-96">
            {alerts.map((alert) => (
              <Alert 
                key={alert.id} 
                className={cn("border-l-4", getSeverityColor(alert.severity))}
              >
                <div className="flex items-start">
                  <div className={`p-1 mr-3 rounded-full ${alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'high' ? 'text-orange-500' : alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <AlertTitle className="text-base font-semibold">
                      {alert.message}
                    </AlertTitle>
                    <AlertDescription className="text-sm mt-1">
                      {alert.details && <p>{alert.details}</p>}
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        {alert.source && (
                          <>
                            <span className="mx-1">•</span>
                            <span>Source: {alert.source}</span>
                          </>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                  <div className="ml-2 flex flex-col items-end">
                    {alert.resolved ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Resolved
                      </span>
                    ) : onResolve ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onResolve(alert.id)}
                        className="text-xs h-7"
                      >
                        Resolve
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Shield className="h-12 w-12 mb-4 text-green-500" />
            <p className="text-lg font-medium">No security alerts detected</p>
            <p className="text-sm mt-1">Your network is currently secure</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


