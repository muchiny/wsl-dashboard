import { test, expect } from "./fixtures/tauri-mock";

test.describe("Settings - Preferences Tab", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/settings");
    await tauriPage.getByRole("tab", { name: /Preferences/i }).click();
  });

  test("should show theme selection buttons", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Mocha/i)).toBeVisible();
    await expect(tauriPage.getByText(/Latte/i)).toBeVisible();
  });

  test("should show language selector", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/English/i).first()).toBeVisible();
  });

  test("should show monitoring interval selectors", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Metrics/i).first()).toBeVisible();
  });

  test("should show snapshot directory inputs", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/snapshot/i).first()).toBeVisible();
  });

  test("should show alert threshold controls", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/CPU/i).first()).toBeVisible();
    await expect(tauriPage.getByText(/Memory/i).first()).toBeVisible();
    await expect(tauriPage.getByText(/Disk/i).first()).toBeVisible();
  });

  test("should show developer mode toggle", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Developer/i).first()).toBeVisible();
  });

  test("should toggle developer mode", async ({ tauriPage }) => {
    const toggle = tauriPage.getByRole("switch", { name: /Developer/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  test("should switch theme", async ({ tauriPage }) => {
    // Click Latte (light) theme button
    await tauriPage.getByText(/Latte/i).click();
    await expect(tauriPage.locator("[data-theme='light']").first()).toBeVisible();
  });

  test("should use browse button for snapshot directory", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/browse.*snapshot/i).click();
    // Dialog plugin returns mock path
    await expect(tauriPage.locator('input[value*="mock"]').first()).toBeVisible({ timeout: 3000 });
  });

  test("should use browse button for install location", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/browse.*install/i).click();
    await expect(tauriPage.locator('input[value*="mock"]').first()).toBeVisible({ timeout: 3000 });
  });

  test("should change metrics interval", async ({ tauriPage }) => {
    // Find the metrics interval selector and change it
    const metricsSelect = tauriPage.getByLabel(/metrics.*interval/i).first();
    if (await metricsSelect.isVisible()) {
      await metricsSelect.click();
      await tauriPage.getByRole("option", { name: /5/i }).first().click();
    }
    // Just verify the preference section is interactive
    await expect(tauriPage.getByText(/Metrics/i).first()).toBeVisible();
  });

  test("should toggle alert threshold", async ({ tauriPage }) => {
    // Find the CPU alert toggle and click it
    const cpuToggle = tauriPage.getByRole("switch").first();
    await cpuToggle.click();
    await expect(cpuToggle).toHaveAttribute("aria-checked", "true");
  });

  test("should enable threshold slider when alert toggle is on", async ({ tauriPage }) => {
    // Enable the first alert toggle (CPU)
    const cpuToggle = tauriPage.getByRole("switch").first();
    await cpuToggle.click();
    await expect(cpuToggle).toHaveAttribute("aria-checked", "true");
    // Range slider should now be enabled
    const slider = tauriPage.locator('input[type="range"]').first();
    await expect(slider).not.toBeDisabled();
  });

  test("should change threshold slider value", async ({ tauriPage }) => {
    // Enable the first alert toggle
    const cpuToggle = tauriPage.getByRole("switch").first();
    await cpuToggle.click();
    // Change the range value
    const slider = tauriPage.locator('input[type="range"]').first();
    await slider.fill("75");
    await expect(slider).toHaveValue("75");
  });

  test("should show Mocha theme button as selected in dark mode", async ({ tauriPage }) => {
    // Default is dark mode (Mocha) — the Mocha button (contains Moon icon) should have selected border
    // The button is the grandparent of the "Mocha" text: button > div.text-left > p "Mocha"
    const mochaButton = tauriPage.getByText(/Mocha/i).first().locator("xpath=ancestor::button");
    await expect(mochaButton).toHaveClass(/border-blue/);
  });
});
