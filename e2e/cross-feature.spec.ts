import { test, expect } from "./fixtures/tauri-mock";

test.describe("Cross-Feature Navigation", () => {
  test("should navigate from Monitor button to monitoring page with distro pre-selected", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    await tauriPage.getByLabel(/Monitor Ubuntu/i).click();
    await expect(tauriPage).toHaveURL(/\/monitoring.*distro=Ubuntu/);
  });

  test("should navigate from Fedora Monitor button to monitoring with Fedora selected", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await tauriPage.getByLabel(/Monitor Fedora/i).click();
    await expect(tauriPage).toHaveURL(/\/monitoring.*distro=Fedora/);
  });

  test("should open terminal from distro card Terminal button", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    await expect(tauriPage.getByTestId("terminal-toggle")).toBeVisible();
  });

  test("should switch between all settings tabs", async ({ tauriPage }) => {
    await tauriPage.goto("/settings");

    // Config tab (default)
    await expect(tauriPage.getByText("2.3.26.0")).toBeVisible();

    // Network tab
    await tauriPage.getByRole("tab", { name: /Network/i }).click();
    await expect(tauriPage.getByText(/Port Forwarding/i).first()).toBeVisible();

    // Optimization tab
    await tauriPage.getByRole("tab", { name: /Optimization/i }).click();
    await expect(tauriPage.getByText(/VHDX/i).first()).toBeVisible();

    // Audit tab
    await tauriPage.getByRole("tab", { name: /Audit/i }).click();
    await expect(tauriPage.getByText(/Audit Log/i).first()).toBeVisible();

    // Preferences tab
    await tauriPage.getByRole("tab", { name: /Preferences/i }).click();
    await expect(tauriPage.getByText(/Mocha/i)).toBeVisible();
  });

  test("should preserve distro list state when navigating away and back", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    // Navigate to monitoring
    await tauriPage.getByTestId("nav-monitoring").click();
    await expect(tauriPage).toHaveURL(/\/monitoring/);

    // Navigate back to distributions
    await tauriPage.getByTestId("nav-distributions").click();
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Debian")).toBeVisible();
    await expect(tauriPage.getByText("Fedora")).toBeVisible();
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });
});
