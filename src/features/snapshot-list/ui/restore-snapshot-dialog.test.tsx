import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
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
  usePreferencesStore: () => ({
    defaultInstallLocation: "C:\\WSL",
  }),
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
});
