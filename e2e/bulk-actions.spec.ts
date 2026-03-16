import { test, expect } from "./fixtures/tauri-mock";

test.describe("Bulk Actions", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should show Start All button", async ({ tauriPage }) => {
    await expect(tauriPage.getByTestId("start-all")).toBeVisible();
  });

  test("should show Shutdown All button", async ({ tauriPage }) => {
    await expect(tauriPage.getByTestId("stop-all")).toBeVisible();
  });

  test("should show New Snapshot button in toolbar", async ({ tauriPage }) => {
    await expect(tauriPage.getByTestId("new-snapshot")).toBeVisible();
  });

  test("should open create snapshot dialog from toolbar", async ({ tauriPage }) => {
    await tauriPage.getByTestId("new-snapshot").click();
    await expect(tauriPage.getByTestId("create-snapshot-submit")).toBeVisible();
  });

  test("should show distro stats", async ({ tauriPage }) => {
    // Stats should show running and stopped counts
    await expect(tauriPage.getByText(/4 distros/i)).toBeVisible();
    await expect(tauriPage.getByText(/2 up/i)).toBeVisible();
    await expect(tauriPage.getByText(/2 off/i)).toBeVisible();
  });
});
