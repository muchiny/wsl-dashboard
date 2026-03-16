import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { RestoreSnapshotDialog } from "./restore-snapshot-dialog";

const mockMutate = vi.fn();
vi.mock("../api/mutations", () => ({
  useRestoreSnapshot: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { defaultInstallLocation: "C:\\WSL" };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn(() => Promise.resolve("C:\\WSL\\Ubuntu")),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

describe("RestoreSnapshotDialog", () => {
  const defaultProps = {
    open: true,
    snapshotId: "snap-123",
    distroName: "Ubuntu",
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Restore Snapshot")).not.toBeInTheDocument();
  });

  it("does not render when snapshotId is null", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} snapshotId={null} />);
    expect(screen.queryByText("Restore Snapshot")).not.toBeInTheDocument();
  });

  it("renders dialog title when open with snapshotId", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    expect(screen.getByText("Restore Snapshot")).toBeInTheDocument();
  });

  it("shows clone and overwrite mode radio buttons", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    expect(screen.getByText("Clone")).toBeInTheDocument();
    expect(screen.getByText("Overwrite")).toBeInTheDocument();
    expect(screen.getByText("Create as new distro")).toBeInTheDocument();
    expect(screen.getByText("Replace original distro")).toBeInTheDocument();
  });

  it("shows new distro name field in clone mode (default)", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    expect(screen.getByText("New Distribution Name")).toBeInTheDocument();
  });

  it("shows overwrite warning when switching to overwrite mode", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Overwrite"));
    expect(screen.getByText(/This will terminate and replace/)).toBeInTheDocument();
  });

  it("shows cancel and submit buttons", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Restore")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows name validation error for invalid characters", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText("e.g. Ubuntu-restored");
    fireEvent.change(nameInput, { target: { value: "invalid name!" } });
    expect(
      screen.getByText("Only letters, numbers, dots, hyphens and underscores allowed"),
    ).toBeInTheDocument();
  });

  it("does not show name error for valid name", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText("e.g. Ubuntu-restored");
    fireEvent.change(nameInput, { target: { value: "Ubuntu-restored" } });
    expect(
      screen.queryByText("Only letters, numbers, dots, hyphens and underscores allowed"),
    ).not.toBeInTheDocument();
  });

  it("shows install location field in clone mode", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    expect(screen.getByText("Install Location")).toBeInTheDocument();
    expect(
      screen.getByText("Directory where the distribution's virtual disk will be stored."),
    ).toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("restore-snapshot-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("submits clone form with valid name", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText("e.g. Ubuntu-restored");
    fireEvent.change(nameInput, { target: { value: "Ubuntu-clone" } });

    fireEvent.click(screen.getByTestId("restore-snapshot-submit"));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_id: "snap-123",
        mode: "clone",
        new_name: "Ubuntu-clone",
      }),
      expect.any(Object),
    );
  });

  it("does not submit clone form without name", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    fireEvent.click(screen.getByTestId("restore-snapshot-submit"));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not submit clone form with invalid name", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText("e.g. Ubuntu-restored");
    fireEvent.change(nameInput, { target: { value: "bad name!" } });
    fireEvent.click(screen.getByTestId("restore-snapshot-submit"));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("switches to overwrite mode and renders overwrite form", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    fireEvent.click(screen.getByTestId("restore-mode-overwrite"));
    // Should no longer show the new name field
    expect(screen.queryByPlaceholderText("e.g. Ubuntu-restored")).not.toBeInTheDocument();
    // Should show overwrite-specific content
    expect(screen.getByText(/This will terminate and replace/)).toBeInTheDocument();
  });

  it("switches back to clone mode from overwrite", () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    // Switch to overwrite
    fireEvent.click(screen.getByTestId("restore-mode-overwrite"));
    expect(screen.queryByPlaceholderText("e.g. Ubuntu-restored")).not.toBeInTheDocument();
    // Switch back to clone
    fireEvent.click(screen.getByTestId("restore-mode-clone"));
    expect(screen.getByPlaceholderText("e.g. Ubuntu-restored")).toBeInTheDocument();
  });

  it("submits overwrite mode", async () => {
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} />);
    fireEvent.click(screen.getByTestId("restore-mode-overwrite"));

    // Wait for the async path resolution from tauriInvoke
    await waitFor(() => {
      expect(screen.getByTestId("restore-snapshot-submit")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("restore-snapshot-submit"));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_id: "snap-123",
        mode: "overwrite",
      }),
      expect.any(Object),
    );
  });

  it("calls onClose and resets form on successful restore", () => {
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    const onClose = vi.fn();
    renderWithProviders(<RestoreSnapshotDialog {...defaultProps} onClose={onClose} />);
    const nameInput = screen.getByPlaceholderText("e.g. Ubuntu-restored");
    fireEvent.change(nameInput, { target: { value: "Ubuntu-clone" } });
    fireEvent.click(screen.getByTestId("restore-snapshot-submit"));

    expect(mockMutate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
