import { test, expect } from "./fixtures/tauri-mock";

test.describe("Browser Navigation", () => {
  test("should navigate back via browser history", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    // Navigate to monitoring
    await tauriPage.getByTestId("nav-monitoring").click();
    await expect(tauriPage.getByText(/Monitoring/i).first()).toBeVisible();

    // Go back
    await tauriPage.goBack();
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    expect(tauriPage.url()).toContain("/");
  });

  test("should navigate forward via browser history", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await tauriPage.getByTestId("nav-monitoring").click();
    await expect(tauriPage.getByText(/Monitoring/i).first()).toBeVisible();

    await tauriPage.goBack();
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    await tauriPage.goForward();
    expect(tauriPage.url()).toContain("/monitoring");
  });

  test("should load settings directly by URL", async ({ tauriPage }) => {
    await tauriPage.goto("/settings");
    await expect(tauriPage.getByText(/Settings/i).first()).toBeVisible();
    await expect(tauriPage.getByText("2.3.26.0")).toBeVisible();
  });
});
