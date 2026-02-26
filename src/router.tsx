import { createRouter, createRoute, createRootRoute } from "@tanstack/react-router";
import { RootLayout } from "@/shared/ui/root-layout";
import { DistrosPage } from "@/pages/distros/ui/distros-page";
import { MonitoringPage } from "@/pages/monitoring/ui/monitoring-page";
import { SettingsPage } from "@/pages/settings/ui/settings-page";

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
  validateSearch: (search: Record<string, unknown>) => ({
    distro: (search.distro as string) || undefined,
  }),
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
