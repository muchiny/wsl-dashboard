import { test, expect } from "./fixtures/tauri-mock";

test.describe("Distro Detail Drawer", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should open drawer when clicking a distro card", async ({ tauriPage }) => {
    await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
    // Drawer opens - snapshot restore button appears
    await expect(tauriPage.getByTestId("snapshot-restore").first()).toBeVisible();
  });

  test("should close drawer when clicking X button", async ({ tauriPage }) => {
    await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
    await expect(tauriPage.getByTestId("snapshot-restore").first()).toBeVisible();

    // Close drawer via close button (inside the drawer panel, not the window close)
    const drawer = tauriPage.locator(".slide-in-from-right");
    await drawer.getByLabel(/Close/i).click();
    await expect(tauriPage.getByTestId("snapshot-restore")).not.toBeVisible();
  });

  test("should toggle drawer when clicking same card again", async ({ tauriPage }) => {
    const card = tauriPage.getByRole("button", { name: /Ubuntu/i }).first();

    // Open
    await card.click();
    await expect(tauriPage.getByTestId("snapshot-restore").first()).toBeVisible();

    // Close by clicking same card
    await card.click();
    await expect(tauriPage.getByTestId("snapshot-restore")).not.toBeVisible();
  });

  test("should show New Snapshot button in drawer", async ({ tauriPage }) => {
    await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
    await expect(tauriPage.getByText(/New Snapshot/i)).toBeVisible();
  });

  test("should open create snapshot dialog from drawer", async ({ tauriPage }) => {
    await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
    await tauriPage.getByText(/New Snapshot/i).click();
    await expect(tauriPage.getByTestId("create-snapshot-submit")).toBeVisible();
  });
});
