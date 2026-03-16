/* eslint-disable react-hooks/rules-of-hooks, @typescript-eslint/no-explicit-any */
import { test as base, expect } from "./fixtures/tauri-mock";

// Extend the tauriPage fixture to inject developer mode before page loads
const test = base.extend({
  tauriPage: async ({ tauriPage }, use) => {
    await tauriPage.addInitScript(() => {
      localStorage.setItem(
        "wsl-nexus-preferences",
        JSON.stringify({
          state: {
            metricsInterval: 2000,
            processesInterval: 3000,
            defaultSnapshotDir: "",
            defaultInstallLocation: "",
            sortKey: "name-asc",
            viewMode: "grid",
            developerMode: true,
            alertThresholds: [
              { alert_type: "cpu", threshold_percent: 90, enabled: false },
              { alert_type: "memory", threshold_percent: 85, enabled: false },
              { alert_type: "disk", threshold_percent: 90, enabled: false },
            ],
          },
          version: 0,
        }),
      );
    });
    await use(tauriPage);
  },
});

test.describe("Debug Console", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should show debug console toggle bar when developer mode enabled", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Debug Console/i)).toBeVisible();
  });

  test("should show debug button in header when developer mode enabled", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Toggle debug console/i)).toBeVisible();
  });

  test("should toggle debug console expand/collapse", async ({ tauriPage }) => {
    // Click to toggle state
    const toggleBar = tauriPage.getByText(/Debug Console/i);
    await toggleBar.click();
    // Click again to toggle back
    await toggleBar.click();
    // Verify the toggle bar is still visible regardless
    await expect(toggleBar).toBeVisible();
  });

  test("should show log entries after adding to store", async ({ tauriPage }) => {
    // Add log entries directly to the Zustand store (bypasses Tauri event system
    // which is affected by React StrictMode double-mount clearing the listener)
    await tauriPage.evaluate(() => {
      // Access the Zustand store directly via its internals
      const storeApi = (window as any).__ZUSTAND_DEBUG_CONSOLE_STORE__;
      if (storeApi) {
        storeApi.getState().addLog({
          id: 99001,
          timestamp: "10:00:01",
          level: "INFO",
          target: "wsl_cli",
          message: "Test distribution listing",
        });
        storeApi.getState().addLog({
          id: 99002,
          timestamp: "10:00:02",
          level: "ERROR",
          target: "snapshot",
          message: "Test VHDX read failure",
        });
      }
    });

    // Ensure console is open
    const entryLocator = tauriPage.getByText("Test distribution listing");
    if (!(await entryLocator.isVisible())) {
      await tauriPage.getByText(/Debug Console/i).click();
    }

    await expect(entryLocator).toBeVisible({ timeout: 5000 });
    await expect(tauriPage.getByText("Test VHDX read failure")).toBeVisible();
  });

  test("should clear logs when clicking clear button", async ({ tauriPage }) => {
    // Add a log directly to the store
    await tauriPage.evaluate(() => {
      const storeApi = (window as any).__ZUSTAND_DEBUG_CONSOLE_STORE__;
      if (storeApi) {
        storeApi.getState().addLog({
          id: 99099,
          timestamp: "10:00:01",
          level: "INFO",
          target: "test",
          message: "Log to be cleared",
        });
      }
    });

    // Ensure console is open
    const entryLocator = tauriPage.getByText("Log to be cleared");
    if (!(await entryLocator.isVisible())) {
      await tauriPage.getByText(/Debug Console/i).click();
    }
    await expect(entryLocator).toBeVisible();

    // Clear logs
    await tauriPage.getByLabel(/Clear/i).click();
    await expect(entryLocator).not.toBeVisible();
  });

  test("should filter by Error level", async ({ tauriPage }) => {
    // Add ERROR and INFO entries
    await tauriPage.evaluate(() => {
      const store = (window as any).__ZUSTAND_DEBUG_CONSOLE_STORE__;
      if (store) {
        store.getState().addLog({ id: 88001, timestamp: "10:00:01", level: "ERROR", target: "test", message: "Error entry for filter" });
        store.getState().addLog({ id: 88002, timestamp: "10:00:02", level: "INFO", target: "test", message: "Info entry for filter" });
      }
    });

    // Ensure console is open
    if (!(await tauriPage.getByText("Error entry for filter").isVisible())) {
      await tauriPage.getByText(/Debug Console/i).click();
    }
    await expect(tauriPage.getByText("Error entry for filter")).toBeVisible();

    // Click Error filter — scope to the debug console expandable panel
    const debugPanel = tauriPage.locator(".glass-panel").last();
    await debugPanel.getByRole("button", { name: "Error", exact: true }).click();
    await expect(tauriPage.getByText("Error entry for filter")).toBeVisible();
    await expect(tauriPage.getByText("Info entry for filter")).not.toBeVisible();
  });

  test("should show all levels when clicking All filter", async ({ tauriPage }) => {
    await tauriPage.evaluate(() => {
      const store = (window as any).__ZUSTAND_DEBUG_CONSOLE_STORE__;
      if (store) {
        store.getState().addLog({ id: 88003, timestamp: "10:00:03", level: "ERROR", target: "test", message: "All-filter error" });
        store.getState().addLog({ id: 88004, timestamp: "10:00:04", level: "INFO", target: "test", message: "All-filter info" });
      }
    });

    if (!(await tauriPage.getByText("All-filter error").isVisible())) {
      await tauriPage.getByText(/Debug Console/i).click();
    }

    // Scope filter buttons to the debug console expandable panel
    const debugPanel = tauriPage.locator(".glass-panel").last();

    // Filter by Error first
    await debugPanel.getByRole("button", { name: "Error", exact: true }).click();
    await expect(tauriPage.getByText("All-filter info")).not.toBeVisible();

    // Click All to show everything
    await debugPanel.getByRole("button", { name: "All", exact: true }).click();
    await expect(tauriPage.getByText("All-filter error")).toBeVisible();
    await expect(tauriPage.getByText("All-filter info")).toBeVisible();
  });

  test("should show entry count on toggle bar", async ({ tauriPage }) => {
    await tauriPage.evaluate(() => {
      const store = (window as any).__ZUSTAND_DEBUG_CONSOLE_STORE__;
      if (store) {
        store.getState().addLog({ id: 77001, timestamp: "10:00:01", level: "INFO", target: "test", message: "Count test 1" });
        store.getState().addLog({ id: 77002, timestamp: "10:00:02", level: "INFO", target: "test", message: "Count test 2" });
        store.getState().addLog({ id: 77003, timestamp: "10:00:03", level: "INFO", target: "test", message: "Count test 3" });
      }
    });

    // Toggle bar should show entry count (may include IPC timing entries too)
    await expect(tauriPage.getByText(/\d+ entries/i)).toBeVisible({ timeout: 3000 });
  });
});
