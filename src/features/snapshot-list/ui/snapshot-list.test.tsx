import { describe, it, expect, vi, type Mock } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { SnapshotList } from "./snapshot-list";
import { useSnapshots } from "../api/queries";
import { useDeleteSnapshot } from "../api/mutations";
import type { Snapshot } from "@/shared/types/snapshot";

vi.mock("../api/queries", () => ({
  useSnapshots: vi.fn(),
}));

vi.mock("../api/mutations", () => ({
  useDeleteSnapshot: vi.fn(),
}));

const mockSnapshots: Snapshot[] = [
  {
    id: "1",
    name: "Snap 1",
    distro_name: "Ubuntu",
    description: null,
    snapshot_type: "full",
    format: "tar",
    file_path: "/tmp/snap1.tar",
    file_size_bytes: 1024,
    parent_id: null,
    created_at: "2024-01-01T00:00:00Z",
    status: "completed",
  },
  {
    id: "2",
    name: "Snap 2",
    distro_name: "Ubuntu",
    description: null,
    snapshot_type: "full",
    format: "vhdx",
    file_path: "/tmp/snap2.vhdx",
    file_size_bytes: 2048,
    parent_id: null,
    created_at: "2024-01-02T00:00:00Z",
    status: "completed",
  },
];

const mockDeleteMutate = vi.fn();

function setupMocks(overrides: {
  data?: Snapshot[];
  isLoading?: boolean;
  error?: Error | null;
  isPending?: boolean;
} = {}) {
  (useSnapshots as Mock).mockReturnValue({
    data: overrides.data ?? undefined,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
  });
  (useDeleteSnapshot as Mock).mockReturnValue({
    mutate: mockDeleteMutate,
    isPending: overrides.isPending ?? false,
  });
}

const noop = () => {};

describe("SnapshotList", () => {
  it("shows loading skeletons when loading", () => {
    setupMocks({ isLoading: true });
    renderWithProviders(<SnapshotList onRestore={noop} />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("shows error message when query fails", () => {
    setupMocks({ error: new Error("Network error") });
    renderWithProviders(<SnapshotList onRestore={noop} />);

    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it("shows empty message when no snapshots", () => {
    setupMocks({ data: [] });
    renderWithProviders(<SnapshotList onRestore={noop} />);

    expect(screen.getByText(/No snapshots yet/)).toBeInTheDocument();
  });

  it("renders snapshot cards when data available", () => {
    setupMocks({ data: mockSnapshots });
    renderWithProviders(<SnapshotList onRestore={noop} />);

    expect(screen.getByText("Snap 1")).toBeInTheDocument();
    expect(screen.getByText("Snap 2")).toBeInTheDocument();
  });

  it("opens delete confirmation dialog when delete clicked", () => {
    setupMocks({ data: mockSnapshots });
    renderWithProviders(<SnapshotList onRestore={noop} />);

    const deleteButtons = screen.getAllByLabelText("Delete snapshot");
    fireEvent.click(deleteButtons[0]!);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "Snap 1"/)).toBeInTheDocument();
  });

  it("calls deleteSnapshot.mutate on confirm", () => {
    setupMocks({ data: mockSnapshots });
    renderWithProviders(<SnapshotList onRestore={noop} />);

    const deleteButtons = screen.getAllByLabelText("Delete snapshot");
    fireEvent.click(deleteButtons[0]!);

    const dialog = screen.getByRole("alertdialog");
    const confirmButton = dialog.querySelector("button:last-child")!;
    fireEvent.click(confirmButton);

    expect(mockDeleteMutate).toHaveBeenCalledWith("1", expect.any(Object));
  });

  it("calls onRestore with snapshot id and distro name", () => {
    setupMocks({ data: mockSnapshots });
    const onRestore = vi.fn();
    renderWithProviders(<SnapshotList onRestore={onRestore} />);

    const restoreButtons = screen.getAllByTestId("snapshot-restore");
    fireEvent.click(restoreButtons[0]!);

    expect(onRestore).toHaveBeenCalledWith("1", "Ubuntu");
  });

  it("closes delete dialog on cancel", () => {
    setupMocks({ data: mockSnapshots });
    renderWithProviders(<SnapshotList onRestore={noop} />);

    const deleteButtons = screen.getAllByLabelText("Delete snapshot");
    fireEvent.click(deleteButtons[0]!);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // Click cancel button (first button in dialog)
    const dialog = screen.getByRole("alertdialog");
    const cancelButton = dialog.querySelector("button:first-child")!;
    fireEvent.click(cancelButton);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
