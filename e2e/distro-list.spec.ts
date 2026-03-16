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

  test("should sort by name descending", async ({ tauriPage }) => {
    await tauriPage.getByTestId("sort-dropdown").click();
    await tauriPage.getByTestId("sort-option-name-desc").click();

    const names = await tauriPage.locator("h3").allTextContents();
    expect(names).toEqual(["Ubuntu", "Fedora", "Debian", "Alpine"]);
  });

  test("should sort running first", async ({ tauriPage }) => {
    await tauriPage.getByTestId("sort-dropdown").click();
    await tauriPage.getByTestId("sort-option-status-running").click();

    const names = await tauriPage.locator("h3").allTextContents();
    // Running distros (Ubuntu, Fedora) should come first
    expect(names.slice(0, 2).sort()).toEqual(["Fedora", "Ubuntu"]);
  });

  test("should sort default first", async ({ tauriPage }) => {
    await tauriPage.getByTestId("sort-dropdown").click();
    await tauriPage.getByTestId("sort-option-default-first").click();

    const names = await tauriPage.locator("h3").allTextContents();
    expect(names[0]).toBe("Ubuntu");
  });

  test("should show check icon on selected sort option", async ({ tauriPage }) => {
    await tauriPage.getByTestId("sort-dropdown").click();
    // Name (A-Z) is default — its text should be blue (selected)
    await expect(tauriPage.getByTestId("sort-option-name-asc")).toHaveClass(/text-blue/);
  });

  test("should show default distribution badge on Ubuntu", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/Default distribution/i)).toBeVisible();
  });

  test("should show snapshot count badges", async ({ tauriPage }) => {
    // Ubuntu has 2 snapshots, Debian has 1 — badges use mauve-colored spans with Archive icon
    const ubuntuCard = tauriPage.getByRole("button", { name: /Ubuntu/i }).first();
    await expect(ubuntuCard.locator(".text-mauve").getByText("2")).toBeVisible({ timeout: 5000 });

    const debianCard = tauriPage.getByRole("button", { name: /Debian/i }).first();
    await expect(debianCard.locator(".text-mauve").getByText("1")).toBeVisible({ timeout: 5000 });
  });

  test("should show clear button when searching and clear on click", async ({ tauriPage }) => {
    const searchInput = tauriPage.getByPlaceholder(/search/i);
    await searchInput.fill("Ub");
    await expect(tauriPage.getByTestId("search-clear")).toBeVisible();

    await tauriPage.getByTestId("search-clear").click();
    await expect(searchInput).toHaveValue("");
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should show all distros when clearing empty search results", async ({ tauriPage }) => {
    const searchInput = tauriPage.getByPlaceholder(/search/i);
    await searchInput.fill("xyz");
    // No distros match
    await expect(tauriPage.getByText("Ubuntu")).not.toBeVisible();

    await tauriPage.getByTestId("search-clear").click();
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();
    await expect(tauriPage.getByText("Alpine")).toBeVisible();
  });

  test("should show empty state message when filters match nothing", async ({ tauriPage }) => {
    const searchInput = tauriPage.getByPlaceholder(/search/i);
    await searchInput.fill("nonexistent-distro");
    await expect(tauriPage.getByText(/No distributions match/i)).toBeVisible();
  });

  test("should open drawer with Enter key on focused card", async ({ tauriPage }) => {
    // Focus the first distro card and press Enter
    const firstCard = tauriPage.getByRole("button", { name: /Ubuntu.*Running/i });
    await firstCard.focus();
    await tauriPage.keyboard.press("Enter");
    // Drawer should open showing snapshot info
    await expect(tauriPage.getByTestId("snapshot-restore").first()).toBeVisible({ timeout: 3000 });
  });

  test("should open drawer with Space key on focused card", async ({ tauriPage }) => {
    const firstCard = tauriPage.getByRole("button", { name: /Ubuntu.*Running/i });
    await firstCard.focus();
    await tauriPage.keyboard.press("Space");
    await expect(tauriPage.getByTestId("snapshot-restore").first()).toBeVisible({ timeout: 3000 });
  });

});
