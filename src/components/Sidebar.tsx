import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Server, Home, Network, Shield, BarChart, Package, Settings, Power } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NavItemProps {
  title: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItemProps[] = [
  { title: "Dashboard", icon: Home, path: "/" },
  { title: "Network", icon: Network, path: "/network" },
  { title: "Firewall", icon: Shield, path: "/firewall" },
  { title: "Performance", icon: BarChart, path: "/performance" },
  { title: "Packet Analysis", icon: Package, path: "/packet" },
  { title: "System", icon: Server, path: "/system/information" },
  { title: "Configuration", icon: Settings, path: "/configuration" },
];

export function NavItem({ title, icon: Icon, path }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === path || location.pathname.startsWith(path);

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive}>
            <NavLink to={path} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{title}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function MainSidebar() {
  const [rebootDialogOpen, setRebootDialogOpen] = useState(false);

  const handleReboot = () => {
    console.log("Rebooting system...");
    setRebootDialogOpen(false);
  };

  return (
    <>
      <Sidebar className="bg-sidebar text-white w-52">
        <SidebarContent>
          <div className="flex h-20 items-center px-4">
            <div className="flex flex-col items-center gap-1">
              <img
                src="/src/assets/telnet_logo.png"
                alt="Telnet Logo"
                className="h-10 w-auto"
              />
              <span className="text-lg italic text-techgray font-tech">
                Gateway Admin
              </span>
            </div>
          </div>

          <SidebarGroupContent>
            {navItems.map((item) => (
              <NavItem
                key={item.title}
                title={item.title}
                icon={item.icon}
                path={item.path}
              />
            ))}
          </SidebarGroupContent>
        </SidebarContent>

        <SidebarFooter className="border-t p-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setRebootDialogOpen(true)}
          >
            <Power className="mr-2 h-4 w-4" />
            Reboot
          </Button>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={rebootDialogOpen} onOpenChange={setRebootDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reboot System</DialogTitle>
            <DialogDescription>
              Are you sure you want to reboot the gateway? All active connections will be terminated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRebootDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReboot}>
              Reboot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}