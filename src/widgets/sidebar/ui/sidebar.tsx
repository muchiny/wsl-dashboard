import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Server,
  Archive,
  Activity,
  Container,
  Wrench,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/distros", label: "Distributions", icon: Server },
  { to: "/snapshots", label: "Snapshots", icon: Archive },
  { to: "/monitoring", label: "Monitoring", icon: Activity },
  { to: "/docker", label: "Docker", icon: Container },
  { to: "/iac", label: "IaC Tools", icon: Wrench },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const matchRoute = useMatchRoute();

  return (
    <aside className="border-border bg-card flex w-64 flex-col border-r">
      <div className="border-border border-b p-4">
        <h1 className="text-primary text-xl font-bold tracking-tight">WSL Nexus</h1>
        <p className="text-muted-foreground text-xs">WSL2 Management</p>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = matchRoute({ to: item.to, fuzzy: true });
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground font-medium",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
