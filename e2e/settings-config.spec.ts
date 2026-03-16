import { test, expect } from "./fixtures/tauri-mock";

test.describe("Settings - Config Tab", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/settings");
  });

  test("should show settings page heading", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Settings/i).first()).toBeVisible();
  });

  test("should show WSL Info panel with version info", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("2.3.26.0")).toBeVisible();
    await expect(tauriPage.getByText("5.15.167.4-1")).toBeVisible();
  });

  test("should show WSL Config editor with current values", async ({ tauriPage }) => {
    await expect(tauriPage.locator('input[value="8GB"]')).toBeVisible();
    await expect(tauriPage.locator('input[value="4"]')).toBeVisible();
  });

  test("should show save button", async ({ tauriPage }) => {
    await expect(tauriPage.getByTestId("wslconfig-save")).toBeVisible();
  });

  test("should show advanced toggle button", async ({ tauriPage }) => {
    await expect(tauriPage.getByTestId("wslconfig-advanced-toggle")).toBeVisible();
  });

  test("should expand advanced settings when clicking toggle", async ({ tauriPage }) => {
    await tauriPage.getByTestId("wslconfig-advanced-toggle").click();
    // Advanced fields should now be visible (e.g., kernel path)
    await expect(tauriPage.getByText(/Kernel/i).first()).toBeVisible();
  });

  test("should show networking mode dropdown", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Mirrored/i).first()).toBeVisible();
  });

  test("should validate invalid memory input", async ({ tauriPage }) => {
    // Find memory input by placeholder
    const memoryInput = tauriPage.getByPlaceholder(/4GB/i);
    await memoryInput.clear();
    await memoryInput.fill("invalid");
    await memoryInput.blur();
    // Error message should appear (red text)
    await expect(tauriPage.locator(".text-red").first()).toBeVisible({ timeout: 3000 });
  });

  test("should edit memory field", async ({ tauriPage }) => {
    // Memory input shows current value from mock (8GB) — find by placeholder
    const memoryInput = tauriPage.getByPlaceholder(/4GB/i);
    await expect(memoryInput).toHaveValue("8GB");
    await memoryInput.clear();
    await memoryInput.fill("16GB");
    await expect(memoryInput).toHaveValue("16GB");
  });

  test("should toggle checkbox fields", async ({ tauriPage }) => {
    const checkbox = tauriPage.locator('input[type="checkbox"]').first();
    const wasChecked = await checkbox.isChecked();
    await checkbox.click();
    if (wasChecked) {
      await expect(checkbox).not.toBeChecked();
    } else {
      await expect(checkbox).toBeChecked();
    }
  });

  test("should disable save button on validation error", async ({ tauriPage }) => {
    const memoryInput = tauriPage.getByPlaceholder(/4GB/i);
    await memoryInput.clear();
    await memoryInput.fill("invalid");
    await memoryInput.blur();
    await expect(tauriPage.locator(".text-red").first()).toBeVisible({ timeout: 3000 });
    await expect(tauriPage.getByTestId("wslconfig-save")).toBeDisabled();
  });

  test("should show advanced fields content when expanded", async ({ tauriPage }) => {
    await tauriPage.getByTestId("wslconfig-advanced-toggle").click();
    // Kernel path placeholder should be visible
    await expect(tauriPage.getByPlaceholder(/kernel/i).first()).toBeVisible();
  });

  test("should show specific validation error message", async ({ tauriPage }) => {
    const memoryInput = tauriPage.getByPlaceholder(/4GB/i);
    await memoryInput.clear();
    await memoryInput.fill("abc");
    await memoryInput.blur();
    // Specific validation message should appear
    await expect(tauriPage.getByText(/Must be a number followed by KB, MB, or GB/i)).toBeVisible({ timeout: 3000 });
  });

  test("should hide advanced fields when toggle clicked again", async ({ tauriPage }) => {
    // Open advanced
    await tauriPage.getByTestId("wslconfig-advanced-toggle").click();
    await expect(tauriPage.getByPlaceholder(/kernel/i).first()).toBeVisible();
    // Close advanced
    await tauriPage.getByTestId("wslconfig-advanced-toggle").click();
    await expect(tauriPage.getByPlaceholder(/kernel/i).first()).not.toBeVisible();
  });

  test("should show swap file field in advanced section", async ({ tauriPage }) => {
    await tauriPage.getByTestId("wslconfig-advanced-toggle").click();
    // Swap file path field should be visible in advanced section
    await expect(tauriPage.getByText(/Swap File/i).first()).toBeVisible();
  });
});
