import { Outlet } from "@tanstack/react-router";
import { Header } from "@/widgets/header/ui/header";
import { DebugConsole } from "@/widgets/debug-console/ui/debug-console";
import { ToastContainer } from "@/shared/ui/toast";
import { ErrorBoundary } from "@/shared/ui/error-boundary";
import { useDebugConsoleSetup } from "@/shared/hooks/use-debug-console";

export function RootLayout() {
  useDebugConsoleSetup();

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <DebugConsole />
      <ToastContainer />
    </div>
  );
}
