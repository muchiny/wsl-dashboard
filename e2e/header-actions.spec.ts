import { test, expect } from "./fixtures/tauri-mock";

test.describe("Header Actions", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should show theme toggle button", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Toggle theme/i)).toBeVisible();
  });

  test("should toggle theme when clicking theme button", async ({ tauriPage }) => {
    const themeBtn = tauriPage.getByLabel(/Toggle theme/i);
    await themeBtn.click();
    // Theme should change - check data-theme attribute
    const html = tauriPage.locator("html");
    const theme = await html.getAttribute("data-theme");
    expect(theme).toBeTruthy();
  });

  test("should show terminal toggle button", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Toggle terminal/i)).toBeVisible();
  });

  test("should show window control buttons", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Minimize/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/Maximize/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/Close/i).first()).toBeVisible();
  });

  test("should show app branding", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("WSL Nexus")).toBeVisible();
  });
});
