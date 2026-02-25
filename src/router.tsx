import { createRouter, createRoute, createRootRoute, Outlet } from "@tanstack/react-router";
import { Header } from "@/widgets/header/ui/header";
import { DebugConsole } from "@/widgets/debug-console/ui/debug-console";
import { DistrosPage } from "@/pages/distros/ui/distros-page";
import { MonitoringPage } from "@/pages/monitoring/ui/monitoring-page";
import { SettingsPage } from "@/pages/settings/ui/settings-page";
import { ErrorBoundary } from "@/shared/ui/error-boundary";
import { useDebugConsoleSetup } from "@/shared/hooks/use-debug-console";

function RootLayout() {
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
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const distrosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DistrosPage,
});

const monitoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/monitoring",
  component: MonitoringPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([distrosRoute, monitoringRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
