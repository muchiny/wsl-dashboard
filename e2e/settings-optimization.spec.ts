import { test, expect } from "./fixtures/tauri-mock";

test.describe("Settings - Optimization Tab", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/settings");
    await tauriPage.getByRole("tab", { name: /Optimization/i }).click();
  });

  test("should show VHDX compact panel", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/VHDX/i).first()).toBeVisible();
  });

  test("should show distro selector", async ({ tauriPage }) => {
    // Distro selector should be present
    await expect(tauriPage.getByRole("button", { name: /select/i }).first()).toBeVisible();
  });

  test("should show optimize button", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Enable Sparse/i).first()).toBeVisible();
  });

  test("should only show WSL2 distros in selector", async ({ tauriPage }) => {
    const selector = tauriPage.getByRole("button", { name: /select/i }).first();
    await selector.click();
    // WSL2 distros should be listed (Ubuntu, Debian, Fedora) but NOT Alpine (WSL1)
    await expect(tauriPage.getByRole("option", { name: /Ubuntu/i })).toBeVisible();
    await expect(tauriPage.getByRole("option", { name: /Debian/i })).toBeVisible();
    await expect(tauriPage.getByRole("option", { name: /Alpine/i })).not.toBeAttached();
  });

  test("should enable button after selecting distro", async ({ tauriPage }) => {
    const selector = tauriPage.getByRole("button", { name: /select/i }).first();
    await selector.click();
    await tauriPage.getByRole("option", { name: /Ubuntu/i }).click();
    // Button should no longer be disabled
    const button = tauriPage.getByText(/Enable Sparse/i).first();
    await expect(button).toBeEnabled();
  });
});
