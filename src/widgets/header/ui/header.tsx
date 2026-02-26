import { useEffect, useState } from "react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Moon,
  Sun,
  Server,
  Activity,
  Settings,
  Terminal,
  Minus,
  Maximize2,
  Minimize2,
  X,
  type LucideIcon,
} from "lucide-react";
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
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    // Check initial maximized state
    appWindow.isMaximized().then(setIsMaximized);
    // Listen for resize events to track maximize/restore
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <header className="border-surface-1 bg-mantle shrink-0 border-b" data-tauri-drag-region>
      <div
        className="flex h-14 items-center justify-between gap-2 px-4 sm:h-16 sm:px-6"
        data-tauri-drag-region
      >
        {/* Branding */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="bg-blue/15 flex h-9 w-9 items-center justify-center rounded-lg">
            <Server className="text-blue h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-text text-base font-bold">WSL Nexus</h1>
            <p className="text-subtext-0 text-xs">WSL2 Management</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="bg-crust flex items-center gap-1 rounded-xl p-1">
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
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2.5",
                  isActive
                    ? "bg-blue text-crust shadow-md"
                    : "text-subtext-1 hover:bg-surface-0 hover:text-text",
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions + Window Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={useDebugConsoleStore.getState().toggle}
            className="text-subtext-0 hover:bg-surface-0 hover:text-text flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            aria-label="Toggle debug console (Ctrl+Shift+D)"
            title="Debug Console (Ctrl+Shift+D)"
          >
            <Terminal className="h-4 w-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="text-subtext-0 hover:bg-surface-0 hover:text-text flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Divider */}
          <div className="bg-surface-1 mx-1 h-5 w-px" />

          {/* Window Controls */}
          <button
            onClick={() => getCurrentWindow().minimize()}
            className="text-subtext-0 hover:bg-surface-0 hover:text-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            aria-label="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => getCurrentWindow().toggleMaximize()}
            className="text-subtext-0 hover:bg-surface-0 hover:text-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => getCurrentWindow().hide()}
            className="text-subtext-0 hover:bg-red/20 hover:text-red flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
