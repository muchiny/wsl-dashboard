import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { CreateSnapshotDialog } from "./create-snapshot-dialog";

const mockMutate = vi.fn();
vi.mock("../api/mutations", () => ({
  useCreateSnapshot: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/shared/api/distro-queries", () => ({
  useDistros: () => ({
    data: [
      {
        name: "Ubuntu",
        state: "Running",
        wsl_version: 2,
        is_default: true,
        base_path: null,
        vhdx_size_bytes: null,
        last_seen: "",
      },
      {
        name: "Debian",
        state: "Stopped",
        wsl_version: 2,
        is_default: false,
        base_path: null,
        vhdx_size_bytes: null,
        last_seen: "",
      },
    ],
  }),
}));

vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: () => ({
    defaultSnapshotDir: "C:\\snapshots",
  }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

describe("CreateSnapshotDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    renderWithProviders(<CreateSnapshotDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: "Create Snapshot" })).not.toBeInTheDocument();
  });

  it("renders dialog title when open", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Create Snapshot" })).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    expect(screen.getByText("Distribution")).toBeInTheDocument();
    expect(screen.getByText("Snapshot Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Output Directory")).toBeInTheDocument();
  });

  it("renders cancel and submit buttons", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Snapshot" })).toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<CreateSnapshotDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pre-selects the default distro when provided", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} defaultDistro="Ubuntu" />);
    expect(screen.getByRole("heading", { name: "Create Snapshot" })).toBeInTheDocument();
  });

  it("populates output directory from preferences store", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    const outputInput = screen
      .getAllByRole("textbox")
      .find((input) => (input as HTMLInputElement).value === "C:\\snapshots");
    expect(outputInput).toBeTruthy();
  });
});
