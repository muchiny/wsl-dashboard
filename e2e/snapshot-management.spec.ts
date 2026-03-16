import { test, expect } from "./fixtures/tauri-mock";

test.describe("Snapshot Management", () => {
  test.describe("Snapshot Cards in Drawer", () => {
    test("should display snapshot details in drawer", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      // Snapshot card should show format badge and restore button
      await expect(tauriPage.getByTestId("snapshot-restore").first()).toBeVisible();
      await expect(tauriPage.getByText("tar").first()).toBeVisible();
    });

    test("should show restore button on completed snapshots", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await expect(tauriPage.getByTestId("snapshot-restore").first()).toBeVisible();
    });

    test("should show delete button on snapshots", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await expect(tauriPage.getByTestId("snapshot-delete").first()).toBeVisible();
    });
  });

  test.describe("Create Snapshot Dialog", () => {
    test("should open create snapshot dialog from toolbar", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByTestId("new-snapshot").click();
      await expect(tauriPage.getByTestId("create-snapshot-submit")).toBeVisible();
    });

    test("should show all form fields", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByTestId("new-snapshot").click();

      // Name input (placeholder: "e.g. Pre-upgrade backup")
      await expect(tauriPage.getByPlaceholder(/Pre-upgrade/i)).toBeVisible();
      // Submit and close buttons
      await expect(tauriPage.getByTestId("create-snapshot-submit")).toBeVisible();
      await expect(tauriPage.getByTestId("create-snapshot-close")).toBeVisible();
      await expect(tauriPage.getByTestId("create-snapshot-browse")).toBeVisible();
    });

    test("should close dialog with close button", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByTestId("new-snapshot").click();
      await expect(tauriPage.getByTestId("create-snapshot-submit")).toBeVisible();

      await tauriPage.getByTestId("create-snapshot-close").click();
      await expect(tauriPage.getByTestId("create-snapshot-submit")).not.toBeVisible();
    });

    test("should open create snapshot dialog from card action", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByLabel(/snapshot.*Ubuntu/i).click();
      await expect(tauriPage.getByTestId("create-snapshot-submit")).toBeVisible();
    });
  });

  test.describe("Restore Snapshot Dialog", () => {
    test("should open restore dialog from snapshot card", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      await expect(tauriPage.getByTestId("restore-snapshot-submit")).toBeVisible();
    });

    test("should show clone mode selected by default", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      await expect(tauriPage.getByTestId("restore-mode-clone")).toBeChecked();
    });

    test("should switch to overwrite mode", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      await tauriPage.getByTestId("restore-mode-overwrite").click();
      await expect(tauriPage.getByTestId("restore-mode-overwrite")).toBeChecked();
    });

    test("should close restore dialog", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      await expect(tauriPage.getByTestId("restore-snapshot-submit")).toBeVisible();

      await tauriPage.getByTestId("restore-snapshot-close").click();
      await expect(tauriPage.getByTestId("restore-snapshot-submit")).not.toBeVisible();
    });

    test("should show overwrite warning when switching mode", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      await tauriPage.getByTestId("restore-mode-overwrite").click();
      // Warning text about replacing the distribution
      await expect(tauriPage.getByText(/replace the original/i)).toBeVisible();
    });

    test("should show clone name input in clone mode", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      // Clone mode is default — name input should be visible
      await expect(tauriPage.getByPlaceholder(/Ubuntu-restored/i)).toBeVisible();
    });

    test("should submit restore snapshot in clone mode", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      // Fill in clone name and install location (both required for clone mode)
      await tauriPage.getByPlaceholder(/Ubuntu-restored/i).fill("TestClone");
      await tauriPage.getByPlaceholder("C:\\WSL\\...").fill("C:\\WSL\\TestClone");
      await tauriPage.getByTestId("restore-snapshot-submit").click();
      await expect(tauriPage.getByTestId("restore-snapshot-submit")).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Create Snapshot Submission", () => {
    test("should submit create snapshot form", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByTestId("new-snapshot").click();
      // Select distro (required)
      await tauriPage.getByRole("button", { name: /Select a distribution/i }).click();
      await tauriPage.getByRole("option", { name: /Ubuntu/i }).click();
      // Fill name (required)
      await tauriPage.getByPlaceholder(/Pre-upgrade/i).fill("Test Snapshot");
      // Fill output directory (required)
      await tauriPage.getByPlaceholder("C:\\Users\\...\\snapshots").fill("C:\\snapshots");
      await tauriPage.getByTestId("create-snapshot-submit").click();
      await expect(tauriPage.getByTestId("create-snapshot-submit")).not.toBeVisible({ timeout: 5000 });
    });

    test("should use browse button in create dialog", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByTestId("new-snapshot").click();
      await tauriPage.getByTestId("create-snapshot-browse").click();
      // Dialog plugin returns "C:\mock\selected-path" — verify output dir input has it
      await expect(tauriPage.locator('input[value*="mock"]')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("Snapshot Deletion", () => {
    test("should delete snapshot via confirm dialog", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      // Click delete on first snapshot
      await tauriPage.getByTestId("snapshot-delete").first().click();
      // Confirm dialog should appear
      await expect(tauriPage.getByRole("alertdialog")).toBeVisible();
      // Confirm deletion
      await tauriPage.getByRole("alertdialog").getByRole("button", { name: /Delete|Confirm/i }).click();
      // Dialog should close after deletion
      await expect(tauriPage.getByRole("alertdialog")).not.toBeVisible({ timeout: 5000 });
    });

    test("should show install location field in clone mode", async ({ tauriPage }) => {
      await tauriPage.goto("/");
      await tauriPage.getByRole("button", { name: /Ubuntu/i }).first().click();
      await tauriPage.getByTestId("snapshot-restore").first().click();
      // Clone mode is default — install location field should be visible
      await expect(tauriPage.getByPlaceholder("C:\\WSL\\...")).toBeVisible();
    });
  });
});
