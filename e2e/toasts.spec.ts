import { test, expect } from "./fixtures/tauri-mock";

test.describe("Toast Notifications", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should show toast after starting a distro", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Start Debian/i).click();
    await expect(tauriPage.getByRole("alert").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show toast after stopping a distro", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Stop Ubuntu/i).click();
    await expect(tauriPage.getByRole("alert").first()).toBeVisible({ timeout: 5000 });
  });

  test("should dismiss toast when clicking dismiss button", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Start Debian/i).click();
    const toast = tauriPage.getByRole("alert").first();
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Dismiss the toast
    await tauriPage.getByLabel(/dismiss/i).first().click();
    await expect(tauriPage.getByRole("alert")).not.toBeVisible({ timeout: 5000 });
  });

  test("should auto-dismiss toast after timeout", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Start Debian/i).click();
    const toast = tauriPage.getByRole("alert").first();
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Success toast duration is 4000ms — wait for it to auto-dismiss
    await expect(tauriPage.getByRole("alert")).not.toBeVisible({ timeout: 8000 });
  });
});
