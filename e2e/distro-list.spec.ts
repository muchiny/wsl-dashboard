import { test, expect } from "./fixtures/tauri-mock";

test.describe("Distro List", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });

  test("should render all four mock distros", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Debian")).toBeVisible();
    await expect(tauriPage.getByText("Fedora")).toBeVisible();
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should filter by status: Running", async ({ tauriPage }) => {
    await tauriPage.getByTestId("filter-status-running").click();

    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Fedora")).toBeVisible();
  });

  test("should filter by status: Stopped", async ({ tauriPage }) => {
    await tauriPage.getByTestId("filter-status-stopped").click();

    await expect(tauriPage.getByText("Debian")).toBeVisible();
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should reset to show all when clicking All filter", async ({ tauriPage }) => {
    await tauriPage.getByTestId("filter-status-running").click();
    await tauriPage.getByTestId("filter-status-all").click();

    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Debian")).toBeVisible();
    await expect(tauriPage.getByText("Fedora")).toBeVisible();
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should filter by WSL version 1", async ({ tauriPage }) => {
    await tauriPage.getByTestId("filter-wsl-1").click();

    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should open and close the sort dropdown", async ({ tauriPage }) => {
    await tauriPage.getByTestId("sort-dropdown").click();

    await expect(tauriPage.getByTestId("sort-option-name-asc")).toBeVisible();
    await expect(tauriPage.getByTestId("sort-option-name-desc")).toBeVisible();

    await tauriPage.getByTestId("sort-option-name-desc").click();
    await expect(tauriPage.getByTestId("sort-option-name-desc")).not.toBeVisible();
  });

  test("should search and filter distros by name", async ({ tauriPage }) => {
    const searchInput = tauriPage.getByPlaceholder(/search/i);
    await searchInput.fill("Ubuntu");

    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
  });
});
