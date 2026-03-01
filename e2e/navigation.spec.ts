import { test, expect } from "./fixtures/tauri-mock";

test.describe("Navigation", () => {
  test("should load the Distributions page by default", async ({ tauriPage }) => {
    await tauriPage.goto("/");

    await expect(tauriPage.getByTestId("nav-distributions")).toBeVisible();
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Debian")).toBeVisible();
  });

  test("should navigate to Monitoring page", async ({ tauriPage }) => {
    await tauriPage.goto("/");

    await tauriPage.getByTestId("nav-monitoring").click();
    await expect(tauriPage).toHaveURL(/\/monitoring/);
  });

  test("should navigate to Settings page", async ({ tauriPage }) => {
    await tauriPage.goto("/");

    await tauriPage.getByTestId("nav-settings").click();
    await expect(tauriPage).toHaveURL(/\/settings/);
  });

  test("should navigate between all three tabs", async ({ tauriPage }) => {
    await tauriPage.goto("/");

    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    await tauriPage.getByTestId("nav-monitoring").click();
    await expect(tauriPage).toHaveURL(/\/monitoring/);

    await tauriPage.getByTestId("nav-settings").click();
    await expect(tauriPage).toHaveURL(/\/settings/);

    await tauriPage.getByTestId("nav-distributions").click();
    await expect(tauriPage).toHaveURL("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should render the header with app branding", async ({ tauriPage }) => {
    await tauriPage.goto("/");

    await expect(tauriPage.getByText("WSL Nexus")).toBeVisible();
    await expect(tauriPage.getByText("WSL2 Management")).toBeVisible();
  });
});
