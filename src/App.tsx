
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
import Network from "@/pages/Network"; 
import Firewall from "@/pages/Firewall";
import Performance from "@/pages/Performance";
import PacketAnalyzer from "./pages/PacketAnalyzer";
import System from "./pages/System";


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
              {/* Main Routes*/}
              <Route path="/" element={<Dashboard />} />
              
              <Route path="/network" element={<Network />} />
              
              <Route path="/firewall" element={<Firewall />} />
              
              <Route path="/performance" element={<Performance />} />
              
              <Route path="/packet" element={<PacketAnalyzer/>} />

              <Route path="/system" element={<System/>} />
              
              {/* System Routes */}

            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
