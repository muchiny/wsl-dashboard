/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { createRouter, createRoute, createRootRoute } from "@tanstack/react-router";
import { RootLayout } from "@/shared/ui/root-layout";

const DistrosPage = lazy(() =>
  import("@/pages/distros/ui/distros-page").then((m) => ({ default: m.DistrosPage })),
);
const MonitoringPage = lazy(() =>
  import("@/pages/monitoring/ui/monitoring-page").then((m) => ({ default: m.MonitoringPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings/ui/settings-page").then((m) => ({ default: m.SettingsPage })),
);

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
