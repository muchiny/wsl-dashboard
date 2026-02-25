import { createRouter, createRoute, createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/widgets/sidebar/ui/sidebar";
import { Header } from "@/widgets/header/ui/header";
import { DashboardPage } from "@/pages/dashboard/ui/dashboard-page";
import { DistrosPage } from "@/pages/distros/ui/distros-page";
import { SnapshotsPage } from "@/pages/snapshots/ui/snapshots-page";
import { MonitoringPage } from "@/pages/monitoring/ui/monitoring-page";
import { DockerPage } from "@/pages/docker/ui/docker-page";
import { SettingsPage } from "@/pages/settings/ui/settings-page";
import { IacPage } from "@/pages/iac/ui/iac-page";
import { ErrorBoundary } from "@/shared/ui/error-boundary";

const rootRoute = createRootRoute({
  component: () => (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const distrosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/distros",
  component: DistrosPage,
});

const snapshotsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/snapshots",
  component: SnapshotsPage,
});

const monitoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/monitoring",
  component: MonitoringPage,
});

const dockerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docker",
  component: DockerPage,
});

const iacRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/iac",
  component: IacPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  distrosRoute,
  snapshotsRoute,
  monitoringRoute,
  dockerRoute,
  iacRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
