import { Link, useMatchRoute } from "@tanstack/react-router";
import { Moon, Sun, Server, Activity, Settings, Terminal, type LucideIcon } from "lucide-react";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useDebugConsoleStore } from "@/shared/hooks/use-debug-console";
import { cn } from "@/shared/lib/utils";

interface NavTab {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navTabs: NavTab[] = [
  { to: "/", label: "Distributions", icon: Server },
  { to: "/monitoring", label: "Monitoring", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const matchRoute = useMatchRoute();

  return (
    <header className="border-b border-surface-1 bg-mantle">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/15">
            <Server className="h-5 w-5 text-blue" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text">WSL Nexus</h1>
            <p className="text-xs text-subtext-0">WSL2 Management</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-crust p-1">
          {navTabs.map((tab) => {
            const isActive =
              tab.to === "/"
                ? matchRoute({ to: "/", fuzzy: false })
                : matchRoute({ to: tab.to, fuzzy: true });

            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue text-crust shadow-md"
                    : "text-subtext-1 hover:bg-surface-0 hover:text-text",
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={useDebugConsoleStore.getState().toggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-subtext-0 transition-colors hover:bg-surface-0 hover:text-text"
            aria-label="Toggle debug console (Ctrl+Shift+D)"
            title="Debug Console (Ctrl+Shift+D)"
          >
            <Terminal className="h-4 w-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-subtext-0 transition-colors hover:bg-surface-0 hover:text-text"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
