import { test, expect } from "./fixtures/tauri-mock";

test.describe("Delete Distro Dialog", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should open delete dialog when clicking trash icon", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByTestId("delete-distro-submit")).toBeVisible();
  });

  test("should show delete snapshots checkbox", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Delete Debian/i).click();
    const checkbox = tauriPage.getByTestId("delete-snapshots-checkbox");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test("should toggle delete snapshots checkbox", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Delete Debian/i).click();
    const checkbox = tauriPage.getByTestId("delete-snapshots-checkbox");
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test("should close dialog when clicking Cancel", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByTestId("delete-distro-submit")).toBeVisible();

    await tauriPage.getByText(/Cancel/i).click();
    await expect(tauriPage.getByTestId("delete-distro-submit")).not.toBeVisible();
  });

  test("should submit delete when clicking delete button", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Delete Debian/i).click();
    await tauriPage.getByTestId("delete-distro-submit").click();
    // Dialog should close after successful delete
    await expect(tauriPage.getByTestId("delete-distro-submit")).not.toBeVisible({ timeout: 5000 });
  });
});
