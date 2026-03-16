import { test, expect } from "./fixtures/tauri-mock";

test.describe("Accessibility", () => {
  test("should have skip-to-content link", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    const skipLink = tauriPage.getByText(/Skip to main content/i);
    await expect(skipLink).toBeAttached();
  });

  test("should have proper ARIA roles on settings tabs", async ({ tauriPage }) => {
    await tauriPage.goto("/settings");

    // Tablist
    await expect(tauriPage.getByRole("tablist")).toBeVisible();

    // Individual tabs
    const tabs = tauriPage.getByRole("tab");
    await expect(tabs).toHaveCount(5);

    // Active tabpanel
    await expect(tauriPage.getByRole("tabpanel")).toBeVisible();
  });

  test("should close dialog on Escape key", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    // Open delete dialog
    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByTestId("delete-distro-submit")).toBeVisible();

    // Press Escape
    await tauriPage.keyboard.press("Escape");
    await expect(tauriPage.getByTestId("delete-distro-submit")).not.toBeVisible();
  });

  test("should have aria-label on distro cards", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    const cards = tauriPage.getByRole("button", { name: /Ubuntu.*Running/i });
    await expect(cards.first()).toBeVisible();
  });

  test("should have proper role on confirm dialog", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByRole("alertdialog")).toBeVisible();
  });

  test("should have aria-selected on settings tabs", async ({ tauriPage }) => {
    await tauriPage.goto("/settings");

    // First tab should be selected
    const firstTab = tauriPage.getByRole("tab").first();
    await expect(firstTab).toHaveAttribute("aria-selected", "true");
  });

  test("should have aria-controls linking tab to tabpanel", async ({ tauriPage }) => {
    await tauriPage.goto("/settings");

    const firstTab = tauriPage.getByRole("tab").first();
    const controls = await firstTab.getAttribute("aria-controls");
    expect(controls).toBeTruthy();

    // The panel with that id should exist
    await expect(tauriPage.locator(`#${controls}`)).toBeVisible();
  });

  test("should close dialog on backdrop click", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    // Open delete dialog
    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByTestId("delete-distro-submit")).toBeVisible();

    // Click at the edge of the viewport to hit the backdrop overlay (not the centered dialog)
    await tauriPage.mouse.click(5, 5);
    await expect(tauriPage.getByTestId("delete-distro-submit")).not.toBeVisible();
  });

  test("should trap focus inside dialog when opened", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByRole("alertdialog")).toBeVisible();

    // DialogShell auto-focuses the first focusable element (the close button)
    await tauriPage.waitForTimeout(200);
    const focusedTag = await tauriPage.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBe("BUTTON");

    // Focus should be inside the dialog, not outside
    const isInsideDialog = await tauriPage.evaluate(
      () => !!document.activeElement?.closest("[role='alertdialog']"),
    );
    expect(isInsideDialog).toBe(true);
  });

  test("should have aria-expanded on language switcher", async ({ tauriPage }) => {
    await tauriPage.goto("/");

    const langButton = tauriPage.getByRole("button", { name: /Switch to/i });
    await expect(langButton).toHaveAttribute("aria-expanded", "false");

    await langButton.click();
    await expect(langButton).toHaveAttribute("aria-expanded", "true");
  });

  test("should trap Tab focus inside dialog", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByRole("alertdialog")).toBeVisible();
    await tauriPage.waitForTimeout(100);

    // Tab several times — focus should always stay inside the dialog
    for (let i = 0; i < 8; i++) {
      await tauriPage.keyboard.press("Tab");
    }
    const isInside = await tauriPage.evaluate(
      () => !!document.activeElement?.closest("[role='alertdialog']"),
    );
    expect(isInside).toBe(true);
  });

  test("should wrap focus with Shift+Tab from first element", async ({ tauriPage }) => {
    await tauriPage.goto("/");
    await expect(tauriPage.getByText("Ubuntu")).toBeVisible();

    await tauriPage.getByLabel(/Delete Debian/i).click();
    await expect(tauriPage.getByRole("alertdialog")).toBeVisible();
    await tauriPage.waitForTimeout(100);

    // Shift+Tab from first focusable element should wrap to last
    await tauriPage.keyboard.press("Shift+Tab");
    const isInside = await tauriPage.evaluate(
      () => !!document.activeElement?.closest("[role='alertdialog']"),
    );
    expect(isInside).toBe(true);
    // Active element should be the last focusable (submit button)
    const tagName = await tauriPage.evaluate(() => document.activeElement?.tagName);
    expect(tagName).toBe("BUTTON");
  });
});
