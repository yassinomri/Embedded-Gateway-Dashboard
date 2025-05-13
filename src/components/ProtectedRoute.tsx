
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { MainSidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { getGatewayStatus, subscribeToStatusChanges } from "@/lib/status-checker";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [key, setKey] = useState(0);
  const [gatewayStatus, setGatewayStatus] = useState(getGatewayStatus().online);

  // Force re-render when location or gateway status changes
  useEffect(() => {
    const unsubscribe = subscribeToStatusChanges((online) => {
      if (online !== gatewayStatus) {
        setGatewayStatus(online);
        // Force re-render of the entire route
        setKey(prev => prev + 1);
      }
    });
    
    return () => unsubscribe();
  }, [gatewayStatus]);

  if (isLoading) {
    // Show loading state
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <MainSidebar />
        <SidebarRail />
        <SidebarInset className="bg-background">
          {/* Use key to force re-render when location or gateway status changes */}
          <Outlet key={`${key}-${location.pathname}`} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
