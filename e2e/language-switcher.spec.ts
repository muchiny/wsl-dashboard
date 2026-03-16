import { test, expect } from "./fixtures/tauri-mock";

test.describe("Language Switcher", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should open dropdown when clicking language button", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Switch to/i).click();
    await expect(tauriPage.getByRole("listbox")).toBeVisible();
  });

  test("should show all 4 language options", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Switch to/i).click();
    const options = tauriPage.getByRole("option");
    await expect(options).toHaveCount(4);
  });

  test("should switch to Spanish", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Switch to/i).click();
    await tauriPage.getByRole("option", { name: /Español/i }).click();
    // UI text should change to Spanish
    await expect(tauriPage.getByText("Distribuciones")).toBeVisible({ timeout: 5000 });
  });

  test("should close dropdown after selection", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Switch to/i).click();
    await expect(tauriPage.getByRole("listbox")).toBeVisible();

    await tauriPage.getByRole("option", { name: /Español/i }).click();
    await expect(tauriPage.getByRole("listbox")).not.toBeVisible();
  });

  test("should close dropdown on Escape", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Switch to/i).click();
    await expect(tauriPage.getByRole("listbox")).toBeVisible();

    await tauriPage.keyboard.press("Escape");
    await expect(tauriPage.getByRole("listbox")).not.toBeVisible();
  });

  test("should mark active language with aria-selected", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Switch to/i).click();
    // English should be the active option
    const englishOption = tauriPage.getByRole("option", { name: /English/i });
    await expect(englishOption).toHaveAttribute("aria-selected", "true");
  });

  test("should switch to French and back to English", async ({ tauriPage }) => {
    // Switch to French
    await tauriPage.getByLabel(/Switch to/i).click();
    await tauriPage.getByRole("option", { name: /Français/i }).click();
    await expect(tauriPage.getByText("Distributions")).toBeVisible({ timeout: 5000 });

    // Switch back to English — aria-label is now in French ("Passer en ...")
    await tauriPage.getByRole("button", { name: /Passer en/i }).click();
    await tauriPage.getByRole("option", { name: /English/i }).click();
    await expect(tauriPage.getByText("Distributions")).toBeVisible({ timeout: 5000 });
  });

  test("should switch to Chinese", async ({ tauriPage }) => {
    await tauriPage.getByLabel(/Switch to/i).click();
    await tauriPage.getByRole("option", { name: /中文/i }).click();
    // Chinese translation for "Distributions" is "发行版"
    await expect(tauriPage.getByText("发行版").first()).toBeVisible({ timeout: 5000 });
  });
});
