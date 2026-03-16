import { test, expect } from "./fixtures/tauri-mock";

test.describe("Distro Actions", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should show Start button for stopped distro", async ({ tauriPage }) => {
    const startBtn = tauriPage.getByLabel(/Start Debian/i);
    await expect(startBtn).toBeVisible();
  });

  test("should not show Start button for running distro", async ({ tauriPage }) => {
    // "Start Ubuntu" should not exist (but "Restart Ubuntu" does, so use exact match)
    await expect(tauriPage.getByLabel("Start Ubuntu", { exact: true })).not.toBeVisible();
  });

  test("should show Stop and Restart buttons for running distro", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Stop Ubuntu/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/Restart Ubuntu/i)).toBeVisible();
  });

  test("should not show Stop or Restart buttons for stopped distro", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Stop Debian/i)).not.toBeVisible();
    await expect(tauriPage.getByLabel(/Restart Debian/i)).not.toBeVisible();
  });

  test("should show Snapshot button on all distros", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/snapshot.*Ubuntu/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/snapshot.*Debian/i)).toBeVisible();
  });

  test("should show Terminal button only on running distros", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/terminal.*Ubuntu/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/terminal.*Debian/i)).not.toBeVisible();
  });

  test("should show Monitor link only on running distros", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Monitor Ubuntu/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/Monitor Debian/i)).not.toBeVisible();
  });

  test("should show Delete button on all distros", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Delete Ubuntu/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/Delete Debian/i)).toBeVisible();
  });

  test("should trigger start action when clicking Start", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Start Debian/i).click();
    // After click, toast should appear confirming the action
    await expect(tauriPage.getByRole("alert").first()).toBeVisible({ timeout: 5000 });
  });
});
