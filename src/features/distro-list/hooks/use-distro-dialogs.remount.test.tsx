import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { useDistroDialogs } from "./use-distro-dialogs";
import { DistroDialogs } from "../ui/distro-dialogs";

// Stub the sibling dialogs so only CreateSnapshotDialog (the one whose local
// state we assert on) is real.
vi.mock("@/features/distro-list/ui/delete-distro-dialog", () => ({
  DeleteDistroDialog: () => null,
}));
vi.mock("@/features/snapshot-list/ui/restore-snapshot-dialog", () => ({
  RestoreSnapshotDialog: () => null,
}));

vi.mock("@/features/distro-list/api/mutations", () => ({
  useShutdownAll: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/features/snapshot-list/api/mutations", () => ({
  useCreateSnapshot: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock("@/shared/api/distro-queries", () => ({
  useDistros: () => ({ data: [{ name: "Ubuntu", state: "Running" }] }),
}));

vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { defaultSnapshotDir: "C:\\snapshots" };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

function Host() {
  const [tick, setTick] = useState(0);
  const dialogs = useDistroDialogs();
  return (
    <>
      <button data-testid="open" onClick={() => dialogs.openCreateSnapshot("Ubuntu")}>
        open
      </button>
      <button data-testid="rerender" onClick={() => setTick((t) => t + 1)}>
        rerender {tick}
      </button>
      <DistroDialogs running={0} dialogs={dialogs.dialogs} />
    </>
  );
}

describe("useDistroDialogs — no remount on parent re-render", () => {
  it("preserves CreateSnapshot form state across a parent re-render", () => {
    renderWithProviders(<Host />);

    fireEvent.click(screen.getByTestId("open"));

    // Change output directory away from its default.
    const outputInput = screen
      .getAllByRole("textbox")
      .find((el) => (el as HTMLInputElement).value === "C:\\snapshots") as HTMLInputElement;
    expect(outputInput).toBeTruthy();
    fireEvent.change(outputInput, { target: { value: "D:\\my-backups" } });

    // Force a parent re-render — this is exactly what the 2s polling triggers
    // in production. A component defined inside the hook would change identity
    // here and remount the whole dialog subtree, resetting the field.
    fireEvent.click(screen.getByTestId("rerender"));

    const after = screen
      .getAllByRole("textbox")
      .find(
        (el) =>
          (el as HTMLInputElement).value === "D:\\my-backups" ||
          (el as HTMLInputElement).value === "C:\\snapshots",
      ) as HTMLInputElement;
    expect(after.value).toBe("D:\\my-backups");
  });
});
