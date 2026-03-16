import { test, expect } from "./fixtures/tauri-mock";

test.describe("View Mode Toggle", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should default to grid view", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Grid view/i)).toBeVisible();
    await expect(tauriPage.getByLabel(/List view/i)).toBeVisible();
  });

  test("should switch to list view", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/List view/i).click();
    // All distros should still be visible
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Debian")).toBeVisible();
    await expect(tauriPage.getByText("Fedora")).toBeVisible();
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should switch back to grid view", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/List view/i).click();
    await tauriPage.getByLabel(/Grid view/i).click();
    // All distros still visible
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should show same distros in both views", async ({ tauriPage }) => {
    // Check grid view
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Debian")).toBeVisible();

    // Switch to list view
    await tauriPage.getByLabel(/List view/i).click();
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Debian")).toBeVisible();
  });
});
