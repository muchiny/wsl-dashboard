import { test, expect } from "./fixtures/tauri-mock";

test.describe("Terminal Panel", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should not show terminal panel initially", async ({ tauriPage }) => {
    // No terminal sessions means panel shouldn't render tabs
    await expect(tauriPage.getByTestId("terminal-new-tab")).not.toBeVisible();
  });

  test("should create terminal session from distro card Terminal button", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    // Terminal panel should appear with a tab
    await expect(tauriPage.getByTestId("terminal-toggle")).toBeVisible();
  });

  test("should show new tab button after session creation", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    await expect(tauriPage.getByTestId("terminal-new-tab")).toBeVisible();
  });

  test("should show toggle minimize/expand button", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    await expect(tauriPage.getByTestId("terminal-toggle")).toBeVisible();
  });

  test("should minimize terminal panel when clicking toggle", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    await expect(tauriPage.getByTestId("terminal-toggle")).toBeVisible();

    // Click toggle to minimize
    await tauriPage.getByTestId("terminal-toggle").click();
    // Panel should still be visible but minimized (h-8)
    await expect(tauriPage.getByTestId("terminal-toggle")).toBeVisible();
  });

  test("should create second terminal tab", async ({ tauriPage }) => {
    // Create first session
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    await expect(tauriPage.getByTestId("terminal-new-tab")).toBeVisible();

    // Create second session via new tab button
    await tauriPage.getByTestId("terminal-new-tab").click();
    // Second tab should be created (session-mock-002)
    await expect(tauriPage.getByTestId("terminal-tab-session-mock-002")).toBeVisible({ timeout: 3000 });
  });

  test("should close terminal tab", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    await expect(tauriPage.getByTestId("terminal-tab-session-mock-001")).toBeVisible();

    // Hover to reveal close button then click it
    const tab = tauriPage.getByTestId("terminal-tab-session-mock-001");
    await tab.hover();
    await tauriPage.getByTestId("terminal-tab-close-session-mock-001").click({ force: true });
    await expect(tauriPage.getByTestId("terminal-tab-session-mock-001")).not.toBeVisible({ timeout: 3000 });
  });

  test("should show tab with distro name", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/terminal.*Ubuntu/i).click();
    // Tab should contain "Ubuntu" text
    const tab = tauriPage.getByTestId("terminal-tab-session-mock-001");
    await expect(tab).toBeVisible();
    await expect(tab.getByText("Ubuntu")).toBeVisible();
  });
});
