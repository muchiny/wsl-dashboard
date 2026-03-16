import { test, expect } from "./fixtures/tauri-mock";

test.describe("Monitoring Page", () => {
  test.beforeEach(async ({ tauriPage }) => {
    await tauriPage.goto("/monitoring");
  });

  test("should show monitoring page heading", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Monitoring/i).first()).toBeVisible();
  });

  test("should auto-select first running distro", async ({ tauriPage }) => {
    // Ubuntu is first running distro, should be auto-selected
    await expect(tauriPage.getByText("Ubuntu").first()).toBeVisible();
  });

  test("should show time range picker with Live selected by default", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("Live")).toBeVisible();
    await expect(tauriPage.getByText("1h")).toBeVisible();
    await expect(tauriPage.getByText("6h")).toBeVisible();
    await expect(tauriPage.getByText("24h")).toBeVisible();
  });

  test("should show CPU chart panel", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/CPU/i).first()).toBeVisible();
  });

  test("should show Memory chart panel", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Memory/i).first()).toBeVisible();
  });

  test("should show disk gauge", async ({ tauriPage }) => {
    await expect(tauriPage.getByText(/Disk/i).first()).toBeVisible();
  });

  test("should show process table with mock processes", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("node server.js")).toBeVisible();
    await expect(tauriPage.getByText("python app.py")).toBeVisible();
  });

  test("should filter processes by search", async ({ tauriPage }) => {
    const filterInput = tauriPage.getByPlaceholder(/filter/i);
    await filterInput.fill("node");
    await expect(tauriPage.getByText("node server.js")).toBeVisible();
    await expect(tauriPage.getByText("python app.py")).not.toBeVisible();
  });

  test("should pre-select distro from URL query parameter", async ({ tauriPage }) => {
    await tauriPage.goto("/monitoring?distro=Fedora");
    // Fedora should be the selected distro
    await expect(tauriPage.getByText("Fedora").first()).toBeVisible();
  });

  test("should switch time range when clicking 1h", async ({ tauriPage }) => {
    const btn1h = tauriPage.getByRole("button", { name: "1h" });
    await btn1h.click();
    // The 1h button should now have the active class (bg-sapphire)
    await expect(btn1h).toHaveClass(/bg-sapphire/);
  });

  test("should show refresh button", async ({ tauriPage }) => {
    await expect(tauriPage.getByLabel(/refresh/i).first()).toBeVisible();
  });

  test("should sort process table by CPU column", async ({ tauriPage }) => {
    // Default sort is CPU descending. Collect initial PID order.
    const pidsBeforeClick = await tauriPage.locator("tbody tr td:first-child").allTextContents();
    // Click CPU sort header to toggle direction
    await tauriPage.getByTestId("process-sort-cpu").click();
    const pidsAfterClick = await tauriPage.locator("tbody tr td:first-child").allTextContents();
    // Order should be reversed
    expect(pidsBeforeClick).not.toEqual(pidsAfterClick);
  });

  test("should toggle sort direction on same column click", async ({ tauriPage }) => {
    // Click PID sort (switches from CPU to PID, descending)
    await tauriPage.getByTestId("process-sort-pid").click();
    const pidsDesc = await tauriPage.locator("tbody tr td:first-child").allTextContents();
    // Click PID sort again (ascending)
    await tauriPage.getByTestId("process-sort-pid").click();
    const pidsAsc = await tauriPage.locator("tbody tr td:first-child").allTextContents();
    // Order should be reversed
    expect(pidsDesc.join(",")).not.toEqual(pidsAsc.join(","));
  });

  // ── KPI Banner tests ──

  test("should render KPI banner with key metrics", async ({ tauriPage }) => {
    // KPI banner should show all 5 key metrics
    await expect(tauriPage.getByText("CPU Usage").first()).toBeVisible();
    await expect(tauriPage.getByText("Memory Usage").first()).toBeVisible();
    await expect(tauriPage.getByText("Disk Usage").first()).toBeVisible();
    await expect(tauriPage.getByText("Swap").first()).toBeVisible();
    await expect(tauriPage.getByText("Network I/O").first()).toBeVisible();
  });

  // ── Section headers tests ──

  test("should render section headers", async ({ tauriPage }) => {
    await expect(tauriPage.locator("h3").getByText("CPU")).toBeVisible();
    await expect(tauriPage.locator("h3").getByText("Memory")).toBeVisible();
    await expect(tauriPage.locator("h3").getByText("Storage")).toBeVisible();
    await expect(tauriPage.locator("h3").getByText("Network")).toBeVisible();
  });

  test("should show Processes section when process data exists", async ({ tauriPage }) => {
    await expect(tauriPage.locator("h3").getByText("Processes")).toBeVisible();
  });

  // ── Per-Core CPU tests ──

  test("should show per-core panel collapsed by default", async ({ tauriPage }) => {
    // Wait for metrics to arrive via system-metrics event
    // The per-core chart should be visible (the mock returns 2 cores: [20, 30])
    await expect(tauriPage.getByText("Per-Core CPU").first()).toBeVisible();
    // Should show core count
    await expect(tauriPage.getByText(/2 cores/)).toBeVisible();
    // Should be collapsed: aria-expanded=false
    const collapseBtn = tauriPage.getByRole("button", { expanded: false }).filter({ hasText: "Per-Core" });
    await expect(collapseBtn).toBeVisible();
  });

  test("should expand per-core chart on click", async ({ tauriPage }) => {
    const collapseBtn = tauriPage.getByRole("button").filter({ hasText: "Per-Core" });
    await collapseBtn.click();
    // After expanding, should show individual core labels
    await expect(tauriPage.getByText("C0")).toBeVisible();
    await expect(tauriPage.getByText("C1")).toBeVisible();
  });

  test("should collapse per-core chart on second click", async ({ tauriPage }) => {
    const collapseBtn = tauriPage.getByRole("button").filter({ hasText: "Per-Core" });
    await collapseBtn.click();
    await expect(tauriPage.getByText("C0")).toBeVisible();
    await collapseBtn.click();
    await expect(tauriPage.getByText("C0")).not.toBeVisible();
  });

  // ── Disk I/O tests ──

  test("should show Disk I/O chart in storage section", async ({ tauriPage }) => {
    await expect(tauriPage.getByText("Disk I/O").first()).toBeVisible();
  });

  // ── Distro switching ──

  test("should switch distro via select and keep charts visible", async ({ tauriPage }) => {
    // Custom Select: click trigger button to open, then click the option
    const selectBtn = tauriPage.getByLabel(/Select distribution/i);
    await selectBtn.click();
    await tauriPage.getByRole("option", { name: "Fedora" }).click();
    // Charts should still be visible after switching
    await expect(tauriPage.getByText("CPU Usage").first()).toBeVisible();
  });
});
