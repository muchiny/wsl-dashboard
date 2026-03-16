import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { RestoreOverwriteForm } from "./restore-overwrite-form";

const mockTauriInvoke = vi.fn();
vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: (...args: unknown[]) => mockTauriInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  distroName: "Ubuntu",
  open: true,
  onPathResolved: vi.fn(),
};

describe("RestoreOverwriteForm", () => {
  it("shows overwrite warning text", () => {
    mockTauriInvoke.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<RestoreOverwriteForm {...defaultProps} />);
    // The warning is a translated string — check the container has warning div
    const { container } = renderWithProviders(<RestoreOverwriteForm {...defaultProps} />);
    const warningDiv = container.querySelector(".border-yellow\\/30");
    expect(warningDiv).toBeTruthy();
  });

  it("displays resolved path after fetch succeeds", async () => {
    mockTauriInvoke.mockResolvedValue("C:\\Users\\test\\wsl\\Ubuntu");
    renderWithProviders(<RestoreOverwriteForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("C:\\Users\\test\\wsl\\Ubuntu")).toBeInTheDocument();
    });
  });

  it("shows manual path input when fetch fails", async () => {
    mockTauriInvoke.mockRejectedValue(new Error("Not found"));
    renderWithProviders(<RestoreOverwriteForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  it("calls onPathResolved with resolved path", async () => {
    const onPathResolved = vi.fn();
    mockTauriInvoke.mockResolvedValue("C:\\resolved\\path");
    renderWithProviders(<RestoreOverwriteForm {...defaultProps} onPathResolved={onPathResolved} />);

    await waitFor(() => {
      expect(onPathResolved).toHaveBeenCalledWith("C:\\resolved\\path", false);
    });
  });
});
