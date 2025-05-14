import { Shield } from "lucide-react";
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFirewall } from '@/lib/firewall-api';
import { cn } from "@/lib/utils";

interface FirewallStatusCardProps {
  className?: string;
}

export function FirewallStatusCard({ className }: FirewallStatusCardProps) {
  const navigate = useNavigate();
  
  const { data: firewallData } = useQuery({
    queryKey: ['firewall'],
    queryFn: () => getFirewall(),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center space-x-2">
          <CardTitle>
            <div className="flex items-center">
              <Shield className="mr-2 h-5 w-5" /> Firewall
            </div>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-4 flex-grow flex flex-col">
        <div className="space-y-3 flex-grow">
          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-base font-medium">Status:</span>
            <span
              className={`px-2 py-1 text-white text-base rounded ${
                firewallData?.enabled ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {firewallData?.enabled ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Summary Info */}
          <div className="flex space-x-4 text-base">
            <span><strong>{firewallData?.rules?.filter(rule => rule.enabled).length || 0}</strong> Active</span>
            <span><strong>{firewallData?.rules?.length || 0}</strong> Total</span>
          </div>
          
          {/* Additional Info - to fill vertical space */}
          <div className="mt-5 flex-grow">
            <h4 className="text-base font-semibold mb-3">Recent Activity</h4>
            <ul className="text-base space-y-2 text-muted-foreground">
              {firewallData?.rules
                ?.slice()
                .reverse()
                .slice(0, 3)
                .map((rule, index) => (
                  <li key={index} className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-3 ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    {rule.name || `Rule ${index + 1}`}
                  </li>
                ))}
              {(!firewallData?.rules || firewallData.rules.length === 0) && (
                <li className="italic">No rules configured</li>
              )}
            </ul>
          </div>
        </div>

        {/* Go to Firewall Page Button - at the bottom */}
        <Button
          onClick={() => navigate("/firewall")}
          className="w-full mt-auto hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300"
          size="sm"
          variant="outline"
        >
          <ArrowRight className="mr-1 h-3 w-3" />
          Manage
        </Button>
      </CardContent>
    </Card>
  );
}




