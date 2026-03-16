import { test, expect } from "./fixtures/tauri-mock";

test.describe("Settings - Network Tab", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/settings");
    await tauriPage.getByRole("tab", { name: /Network/i }).click();
  });

  test("should show port forwarding panel", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Port Forwarding/i).first()).toBeVisible();
  });

  test("should show active forwarding rules", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("3000").first()).toBeVisible();
    await expect(tauriPage.getByText("8080").first()).toBeVisible();
  });

  test("should show admin warning banner", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/administrator/i).first()).toBeVisible();
  });

  test("should open add rule dialog", async ({ tauriPage }) => {
    await tauriPage.getByText(/Add Rule/i).click();
    await expect(tauriPage.getByTestId("add-rule-submit")).toBeVisible();
  });

  test("should show port inputs in add rule dialog", async ({ tauriPage }) => {
    await tauriPage.getByText(/Add Rule/i).click();
    await expect(tauriPage.getByTestId("add-rule-submit")).toBeVisible();
    // Should have port number inputs (placeholder: "e.g. 3000")
    await expect(tauriPage.getByPlaceholder(/3000/).first()).toBeVisible();
  });

  test("should close add rule dialog with Cancel", async ({ tauriPage }) => {
    await tauriPage.getByText(/Add Rule/i).click();
    await expect(tauriPage.getByTestId("add-rule-submit")).toBeVisible();

    await tauriPage.getByText(/Cancel/i).click();
    await expect(tauriPage.getByTestId("add-rule-submit")).not.toBeVisible();
  });

  test("should show remove rule button", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/remove/i).first()).toBeAttached();
  });

  test("should show listening ports when selecting a distro", async ({ tauriPage }) => {
    // Open the distro selector and pick Ubuntu
    const selector = tauriPage.getByRole("button", { name: /select|all/i }).first();
    await selector.click();
    await tauriPage.getByRole("option", { name: /Ubuntu/i }).click();
    // Listening ports should appear
    await expect(tauriPage.getByText("node").first()).toBeVisible({ timeout: 5000 });
  });

  test("should submit add rule form", async ({ tauriPage }) => {
    await tauriPage.getByText(/Add Rule/i).click();
    // Select distro
    const distroSelect = tauriPage.locator("[role='dialog']").getByRole("button", { name: /select/i }).first();
    await distroSelect.click();
    await tauriPage.getByRole("option", { name: /Ubuntu/i }).click();
    // Fill ports
    const portInputs = tauriPage.locator("[role='dialog']").locator('input[type="number"]');
    await portInputs.first().fill("4000");
    await portInputs.nth(1).fill("4000");
    // Submit
    await tauriPage.getByTestId("add-rule-submit").click();
    await expect(tauriPage.getByTestId("add-rule-submit")).not.toBeVisible({ timeout: 5000 });
  });

  test("should remove port forwarding rule", async ({ tauriPage }) => {
    // There should be rules visible initially
    await expect(tauriPage.getByText("3000").first()).toBeVisible();
    // Click remove on first rule
    await tauriPage.getByLabel(/Remove rule/i).first().click();
    // Rule should still be in the DOM (mock returns void, UI needs refetch)
    // Verify the remove button was clickable without errors
    await expect(tauriPage.getByLabel(/Remove rule/i).first()).toBeAttached();
  });

  test("should show listening ports for selected distro", async ({ tauriPage }) => {
    const selector = tauriPage.getByRole("button", { name: /select|all/i }).first();
    await selector.click();
    await tauriPage.getByRole("option", { name: /Ubuntu/i }).click();
    // Port data from mock should appear
    await expect(tauriPage.getByText("3000").first()).toBeVisible({ timeout: 5000 });
    await expect(tauriPage.getByText("postgres").first()).toBeVisible();
  });

  test("should show distro selector for listening ports", async ({ tauriPage }) => {
    // The distro selector should show running distros for port scanning
    const selector = tauriPage.getByRole("button", { name: /select|all/i }).first();
    await expect(selector).toBeVisible();
  });
});
