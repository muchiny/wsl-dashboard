import { useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import { Header } from "@/widgets/header/ui/header";
import { DebugConsole } from "@/widgets/debug-console/ui/debug-console";
import { TerminalPanel } from "@/features/terminal/ui/terminal-panel";
import { useTerminalStore } from "@/features/terminal/model/use-terminal-store";
import { ToastContainer } from "@/shared/ui/toast";
import { ErrorBoundary } from "@/shared/ui/error-boundary";
import { useDebugConsoleSetup } from "@/shared/hooks/use-debug-console";

export function RootLayout() {
  useDebugConsoleSetup();

  // Ctrl+` to toggle terminal panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        useTerminalStore.getState().togglePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <a
        href="#main-content"
        className="bg-blue text-crust fixed top-0 left-1/2 z-[200] -translate-x-1/2 -translate-y-full rounded-b-lg px-4 py-2 text-sm font-medium transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <TerminalPanel />
      <DebugConsole />
      <ToastContainer />
    </div>
  );
}
