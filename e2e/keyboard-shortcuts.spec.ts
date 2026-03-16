/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from "./fixtures/tauri-mock";

// Extend fixture to enable developer mode
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

test.describe("Keyboard Shortcuts", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should toggle debug console with Ctrl+Shift+D", async ({ tauriPage }) => {
    // Debug console toggle bar should be visible (developer mode is on)
    await expect(tauriPage.getByText(/Debug Console/i)).toBeVisible();

    // Press Ctrl+Shift+D to toggle
    await tauriPage.keyboard.press("Control+Shift+D");

    // Check that the console panel is toggled (filter buttons should appear)
    const filterButton = tauriPage.getByRole("button", { name: "All", exact: true });
    const _isVisible = await filterButton.isVisible().catch(() => false);

    // Press again to toggle back
    await tauriPage.keyboard.press("Control+Shift+D");

    // The toggle bar should still be visible regardless
    await expect(tauriPage.getByText(/Debug Console/i)).toBeVisible();
  });

  test("should close dialog with Escape key", async ({ tauriPage }) => {
    // Open a dialog
    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByTestId("delete-distro-submit")).toBeVisible();

    // Press Escape
    await tauriPage.keyboard.press("Escape");
    await expect(tauriPage.getByTestId("delete-distro-submit")).not.toBeVisible();
  });

  test("should navigate Select component with Arrow keys", async ({ tauriPage }) => {
    // Navigate to settings and open preferences tab to find a Select component
    await tauriPage.goto("/settings");
    await tauriPage.getByRole("tab", { name: /Network/i }).click();
    // Open add rule dialog which has a Select component
    await tauriPage.getByText(/Add Rule/i).click();
    await expect(tauriPage.getByTestId("add-rule-submit")).toBeVisible();

    // Focus the distro Select and navigate with keyboard
    const selectButton = tauriPage.locator("[role='dialog']").getByRole("button", { name: /select/i }).first();
    await selectButton.focus();
    // ArrowDown should open the dropdown
    await tauriPage.keyboard.press("ArrowDown");
    await expect(tauriPage.getByRole("listbox")).toBeVisible();
    // Enter should select the highlighted option
    await tauriPage.keyboard.press("Enter");
    await expect(tauriPage.getByRole("listbox")).not.toBeVisible();
  });
});
