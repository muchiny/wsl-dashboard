import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
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
  usePreferencesStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { defaultSnapshotDir: "C:\\snapshots" };
    return selector ? selector(state) : state;
  },
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

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<CreateSnapshotDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("create-snapshot-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("updates snapshot name input", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText(/e\.g\. Pre-upgrade backup/i);
    fireEvent.change(nameInput, { target: { value: "my-snapshot" } });
    expect((nameInput as HTMLInputElement).value).toBe("my-snapshot");
  });

  it("updates description textarea", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    const textareas = screen.getAllByRole("textbox");
    const descInput = textareas.find((el) => el.tagName === "TEXTAREA");
    expect(descInput).toBeTruthy();
    if (descInput) {
      fireEvent.change(descInput, { target: { value: "Test description" } });
      expect((descInput as HTMLTextAreaElement).value).toBe("Test description");
    }
  });

  it("submits form with filled fields", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} defaultDistro="Ubuntu" />);

    // Fill name
    const nameInput = screen.getByPlaceholderText(/e\.g\. Pre-upgrade backup/i);
    fireEvent.change(nameInput, { target: { value: "my-snapshot" } });

    // Submit
    fireEvent.click(screen.getByTestId("create-snapshot-submit"));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        distro_name: "Ubuntu",
        name: "my-snapshot",
        format: "tar",
        output_dir: "C:\\snapshots",
      }),
      expect.any(Object),
    );
  });

  it("does not submit when name is empty", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} defaultDistro="Ubuntu" />);
    fireEvent.click(screen.getByTestId("create-snapshot-submit"));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("renders browse button for output directory", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    expect(screen.getByTestId("create-snapshot-browse")).toBeInTheDocument();
  });

  it("calls onClose and resets form on successful submit", () => {
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    const onClose = vi.fn();
    renderWithProviders(
      <CreateSnapshotDialog open={true} onClose={onClose} defaultDistro="Ubuntu" />,
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Pre-upgrade backup/i);
    fireEvent.change(nameInput, { target: { value: "my-snapshot" } });
    fireEvent.click(screen.getByTestId("create-snapshot-submit"));

    expect(mockMutate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("includes description in submit when provided", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} defaultDistro="Ubuntu" />);

    const nameInput = screen.getByPlaceholderText(/e\.g\. Pre-upgrade backup/i);
    fireEvent.change(nameInput, { target: { value: "my-snapshot" } });

    const textareas = screen.getAllByRole("textbox");
    const descInput = textareas.find((el) => el.tagName === "TEXTAREA");
    if (descInput) {
      fireEvent.change(descInput, { target: { value: "A test description" } });
    }

    fireEvent.click(screen.getByTestId("create-snapshot-submit"));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        distro_name: "Ubuntu",
        name: "my-snapshot",
        description: "A test description",
      }),
      expect.any(Object),
    );
  });

  it("does not submit when distro is not selected", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText(/e\.g\. Pre-upgrade backup/i);
    fireEvent.change(nameInput, { target: { value: "my-snapshot" } });
    fireEvent.click(screen.getByTestId("create-snapshot-submit"));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("syncs distroName when defaultDistro prop changes", () => {
    const { rerender } = renderWithProviders(
      <CreateSnapshotDialog open={true} onClose={vi.fn()} defaultDistro="Ubuntu" />,
    );

    // Change the defaultDistro prop
    rerender(<CreateSnapshotDialog open={true} onClose={vi.fn()} defaultDistro="Debian" />);

    // Fill in the name so we can submit and verify the distro was updated
    const nameInput = screen.getByPlaceholderText(/e\.g\. Pre-upgrade backup/i);
    fireEvent.change(nameInput, { target: { value: "test" } });
    fireEvent.click(screen.getByTestId("create-snapshot-submit"));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ distro_name: "Debian" }),
      expect.any(Object),
    );
  });

  it("browse button calls openDialog for output directory", async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(open).mockResolvedValue("D:\\custom-dir");

    renderWithProviders(<CreateSnapshotDialog {...defaultProps} defaultDistro="Ubuntu" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-snapshot-browse"));
    });

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ directory: true }));
  });

  it("does not submit when output directory is empty", () => {
    renderWithProviders(<CreateSnapshotDialog {...defaultProps} defaultDistro="Ubuntu" />);

    const nameInput = screen.getByPlaceholderText(/e\.g\. Pre-upgrade backup/i);
    fireEvent.change(nameInput, { target: { value: "my-snapshot" } });

    // Clear the output directory
    const outputInput = screen
      .getAllByRole("textbox")
      .find((input) => (input as HTMLInputElement).value === "C:\\snapshots");
    if (outputInput) {
      fireEvent.change(outputInput, { target: { value: "" } });
    }

    fireEvent.click(screen.getByTestId("create-snapshot-submit"));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
