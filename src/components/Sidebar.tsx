import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Server, Home, Network, Shield, BarChart, Package, Power, SettingsIcon, LogOut, UserCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { brand } from "@/lib/brand";
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
import { apiClient } from "@/lib/network-api";

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
  { title: "System", icon: Server, path: "/system" },
  {title: "Settings", icon: SettingsIcon, path: "/settings"},
];

export function NavItem({ title, icon: Icon, path }: NavItemProps) {
  const location = useLocation();
  const isActive =
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive}>
            <NavLink
              to={path}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-brand/15 font-medium text-brand-300 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:bg-brand-400"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
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
  const { user, logout } = useAuth();

  const handleReboot = () => {
      apiClient
        .rebootSystem()
        .then(() => {
          alert("The system is rebooting...");
        })
        .catch((error) => {
          alert(`Failed to reboot the system: ${error.message}`);
        })
        .finally(() => {
          setRebootDialogOpen(false);
        });
  };

  return (
    <>
      <Sidebar className="bg-sidebar text-white w-52">
        <SidebarContent>
          <div className="flex h-20 items-center border-b border-white/10 px-4">
            <BrandLogo />
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

        <SidebarFooter className="space-y-3 border-t border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
              <UserCircle2 className="h-5 w-5 shrink-0 text-brand-400" />
              <span className="truncate">{user?.username ?? "admin"}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="destructive"
            className="w-full border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-600 hover:text-white"
            onClick={() => setRebootDialogOpen(true)}
          >
            <Power className="mr-2 h-4 w-4" />
            Reboot
          </Button>
          <p className="text-center text-[11px] text-slate-500">
            &copy; {new Date().getFullYear()} {brand.author}
          </p>
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
            <Button
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleReboot}
              disabled={false} // You can add a loading state if needed
            >
              Reboot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}