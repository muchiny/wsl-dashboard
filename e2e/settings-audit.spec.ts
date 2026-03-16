import { test, expect } from "./fixtures/tauri-mock";

test.describe("Settings - Audit Tab", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/settings");
    await tauriPage.getByRole("tab", { name: /Audit/i }).click();
  });

  test("should show audit log viewer", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Audit Log/i).first()).toBeVisible();
  });

  test("should show audit entries in table", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("start_distro")).toBeVisible();
    await expect(tauriPage.getByText("Ubuntu").first()).toBeVisible();
  });

  test("should show entry count", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/2 entr/i)).toBeVisible();
  });

  test("should show action filter input", async ({ tauriPage }) => {
    await expect(tauriPage.getByPlaceholder(/action/i)).toBeVisible();
  });

  test("should show target filter input", async ({ tauriPage }) => {
    await expect(tauriPage.getByPlaceholder(/target/i)).toBeVisible();
  });

  test("should show refresh button", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/refresh/i)).toBeVisible();
  });

  test("should filter audit entries by action", async ({ tauriPage }) => {
    // Verify both entries visible initially
    await expect(tauriPage.getByText("start_distro")).toBeVisible();
    await expect(tauriPage.getByText("stop_distro")).toBeVisible();

    // Type in action filter (debounced 300ms)
    await tauriPage.getByPlaceholder(/action/i).fill("stop");
    await tauriPage.waitForTimeout(500);

    await expect(tauriPage.getByText("stop_distro")).toBeVisible();
    await expect(tauriPage.getByText("start_distro")).not.toBeVisible({ timeout: 3000 });
  });

  test("should filter audit entries by target", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("Ubuntu").first()).toBeVisible();

    await tauriPage.getByPlaceholder(/target/i).fill("Fedora");
    await tauriPage.waitForTimeout(500);

    await expect(tauriPage.getByText("Fedora").first()).toBeVisible({ timeout: 3000 });
  });

  test("should refresh audit log on refresh click", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("start_distro")).toBeVisible();
    // Click refresh — entries should still be visible (no error)
    await tauriPage.getByLabel(/refresh/i).click();
    await expect(tauriPage.getByText("start_distro")).toBeVisible({ timeout: 3000 });
  });

  test("should filter by both action and target simultaneously", async ({ tauriPage }) => {
    // Filter by action "stop" AND target "Fedora" — should show only the stop_distro/Fedora entry
    await tauriPage.getByPlaceholder(/action/i).fill("stop");
    await tauriPage.getByPlaceholder(/target/i).fill("Fedora");
    await tauriPage.waitForTimeout(500);

    await expect(tauriPage.getByText("stop_distro")).toBeVisible({ timeout: 3000 });
    await expect(tauriPage.getByText("start_distro")).not.toBeVisible();
  });
});
