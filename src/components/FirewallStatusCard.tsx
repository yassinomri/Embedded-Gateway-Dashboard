import { Shield, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFirewall } from '@/lib/firewall-api';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface FirewallStatusCardProps {
  className?: string;
}

interface FirewallRule {
  name?: string;
  enabled: boolean;
  action?: string; // e.g., "allow", "deny"
  protocol?: string; // e.g., "TCP", "UDP"
  port?: number;
  lastUpdated?: string; // ISO date string
}

interface FirewallData {
  enabled: boolean;
  rules: FirewallRule[];
}

export function FirewallStatusCard({ className }: FirewallStatusCardProps) {
  const navigate = useNavigate();

  const { data: firewallData, isLoading } = useQuery<FirewallData>({
    queryKey: ['firewall'],
    queryFn: () => getFirewall(),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  return (
    <Card className={cn("flex flex-col w-full max-w-lg mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center space-x-2">
          <CardTitle className="flex items-center text-lg font-semibold">
            <Shield className="mr-2 h-5 w-5 text-blue-500" /> Firewall Status
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-4 flex-grow flex flex-col">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4 flex-grow">
            {/* Status Badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-medium text-gray-600">Status:</span>
                    <span
                      className={cn(
                        "px-3 py-1 text-white text-base font-medium rounded transition-colors duration-300",
                        firewallData?.enabled ? "bg-green-500" : "bg-red-500"
                      )}
                      aria-label={`Firewall status: ${firewallData?.enabled ? "Active" : "Inactive"}`}
                    >
                      {firewallData?.enabled ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Firewall protection status</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Summary Info */}
            <div className="flex space-x-6 text-base">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <strong>{firewallData?.rules?.filter(rule => rule.enabled).length || 0}</strong> Active
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Number of active firewall rules</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <strong>{firewallData?.rules?.length || 0}</strong> Total
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Total number of firewall rules</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Recent Activity */}
            <div className="mt-5 flex-grow">
              <h4 className="text-base font-semibold mb-3">Recent Activity</h4>
              <ul className="text-base space-y-3 text-muted-foreground">
                {firewallData?.rules?.length ? (
                  firewallData.rules
                    .slice()
                    .reverse()
                    .slice(0, 3)
                    .map((rule, index) => (
                      <li key={index} className="flex items-center">
                        <span
                          className={cn(
                            "w-3 h-3 rounded-full mr-3",
                            rule.enabled ? 'bg-green-500' : 'bg-gray-300'
                          )}
                          aria-hidden="true"
                        />
                        <div>
                          <span className="font-medium text-foreground">
                            {rule.name || `Rule ${index + 1}`}
                          </span>
                          {(rule.action || rule.protocol || rule.port || rule.lastUpdated) && (
                            <p className="text-sm text-gray-500">
                              {rule.action && `${rule.action.toUpperCase()} `}
                              {rule.protocol && `${rule.protocol}/`}
                              {rule.port && `${rule.port}`}
                              {rule.lastUpdated && ` - ${new Date(rule.lastUpdated).toLocaleString()}`}
                            </p>
                          )}
                        </div>
                      </li>
                    ))
                ) : (
                  <li className="italic text-gray-500">No rules configured</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Manage Button */}
        <Button
          onClick={() => navigate("/firewall")}
          className={cn(
            "w-full mt-4 font-medium transition-transform duration-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          size="sm"
          variant="outline"
          disabled={isLoading}
          aria-label="Navigate to firewall management page"
        >
          <ArrowRight className="mr-1 h-3 w-3" />
          Manage Firewall
        </Button>
      </CardContent>
    </Card>
  );
}