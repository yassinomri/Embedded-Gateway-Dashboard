
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "./pages/NotFound";
import Configuration from "@/pages/Configuration";
import Network from "@/pages/Network"; 
import Firewall from "@/pages/Firewall";
import Performance from "@/pages/Performance";
import PacketAnalyzer from "./pages/PacketAnalyzer";


const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="container mx-auto p-6">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="text-muted-foreground">This page is under construction</p>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              
              {/* Network Route */}
              <Route path="/network" element={<Network />} />
              
              {/* Firewall Routes */}
              <Route path="/firewall" element={<Firewall />} />
              
              {/* Performance Routes */}
              <Route path="/performance" element={<Performance />} />
              
              {/* Packet Analysis Routes */}
              <Route path="/packet" element={<PacketAnalyzer/>} />
              
              {/* System Routes */}
              <Route path="/system/information" element={<PlaceholderPage title="System Information" />} />
              <Route path="/system/firmware" element={<PlaceholderPage title="Firmware Update" />} />
              <Route path="/system/backup" element={<PlaceholderPage title="Backup & Restore" />} />
              <Route path="/system/logs" element={<PlaceholderPage title="System Logs" />} />
              
              {/* Configuration Route */}
              <Route path="/configuration" element={<Configuration />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
