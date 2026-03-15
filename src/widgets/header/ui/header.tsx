import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Moon,
  Sun,
  Server,
  Activity,
  Settings,
  Terminal,
  Bug,
  Minus,
  Maximize2,
  Minimize2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useDebugConsoleStore } from "@/shared/hooks/use-debug-console";
import { useTerminalStore } from "@/features/terminal/model/use-terminal-store";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import { cn } from "@/shared/lib/utils";
import { Tooltip } from "@/shared/ui/tooltip";
import { LanguageSwitcher } from "./language-switcher";

interface NavTab {
  to: string;
  key: string;
  icon: LucideIcon;
}

const navTabs: NavTab[] = [
  { to: "/", key: "nav.distributions", icon: Server },
  { to: "/monitoring", key: "nav.monitoring", icon: Activity },
  { to: "/settings", key: "nav.settings", icon: Settings },
];

export function Header() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const developerMode = usePreferencesStore((s) => s.developerMode);
  const matchRoute = useMatchRoute();
  const [isMaximized, setIsMaximized] = useState(false);

  const resizeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(() => {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        appWindow.isMaximized().then(setIsMaximized);
      }, 150);
    });
    return () => {
      clearTimeout(resizeTimerRef.current);
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleDrag = useCallback(async (e: React.MouseEvent) => {
    // Only drag when clicking empty space — not interactive elements
    // Safety net — stopPropagation on children is the primary guard
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, nav, svg")) return;
    await getCurrentWindow().startDragging();
  }, []);

  const handleDoubleClick = useCallback(async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, nav, svg")) return;
    await getCurrentWindow().toggleMaximize();
  }, []);

  return (
    <header
      className="glass-header relative z-30 shrink-0 rounded-t-xl"
      onMouseDown={handleDrag}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
        {/* Branding */}
        <div className="flex shrink-0 items-center gap-3" onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-blue/25 flex h-9 w-9 items-center justify-center rounded-lg">
            <Server className="text-blue h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-text text-base font-bold">{t("header.appName")}</h1>
            <p className="text-subtext-0 text-xs">{t("header.subtitle")}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          className="glass-surface flex items-center gap-1 rounded-xl p-1 shadow-elevation-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {navTabs.map((tab) => {
            const isActive =
              tab.to === "/"
                ? matchRoute({ to: "/", fuzzy: false })
                : matchRoute({ to: tab.to, fuzzy: true });

            return (
              <Link
                key={tab.to}
                to={tab.to}
                data-testid={`nav-${tab.to === "/" ? "distributions" : tab.to.slice(1)}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2.5",
                  isActive
                    ? "bg-blue text-crust shadow-elevation-2"
                    : "text-subtext-1 hover:text-text hover:bg-white/8",
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(tab.key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions + Window Controls */}
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <Tooltip content="Terminal">
            <button
              onClick={() => useTerminalStore.getState().togglePanel()}
              className="bg-teal/15 text-teal hover:bg-teal/25 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              aria-label={t("header.toggleTerminal")}
            >
              <Terminal className="h-4 w-4" />
            </button>
          </Tooltip>
          {developerMode && (
            <Tooltip content="Debug">
              <button
                onClick={useDebugConsoleStore.getState().toggle}
                className="bg-peach/15 text-peach hover:bg-peach/25 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                aria-label={t("header.toggleDebugConsole")}
              >
                <Bug className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
          <Tooltip content={t("header.toggleTheme")}>
            <button
              onClick={toggleTheme}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                theme === "dark"
                  ? "bg-yellow/15 text-yellow hover:bg-yellow/25"
                  : "bg-blue/15 text-blue hover:bg-blue/25",
              )}
              aria-label={t("header.toggleTheme")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </Tooltip>
          <LanguageSwitcher />

          {/* Divider */}
          <div className="bg-surface-1 mx-1 h-5 w-px" />

          {/* Window Controls */}
          <button
            onClick={() => getCurrentWindow().minimize()}
            className="text-subtext-0 hover:text-text flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/8"
            aria-label={t("header.minimize")}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => getCurrentWindow().toggleMaximize()}
            className="text-subtext-0 hover:text-text flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/8"
            aria-label={isMaximized ? t("header.restore") : t("header.maximize")}
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
            aria-label={t("header.close")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
