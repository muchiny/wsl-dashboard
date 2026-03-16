import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistroBulkActions } from "./distro-bulk-actions";
import type { Distro } from "@/shared/types/distro";

const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("../../api/mutations", () => ({
  useStartAll: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

function makeDistro(overrides: Partial<Distro> = {}): Distro {
  return {
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const distros = [
  makeDistro({ name: "Ubuntu", state: "Running" }),
  makeDistro({ name: "Debian", state: "Stopped" }),
  makeDistro({ name: "Alpine", state: "Stopped" }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPending = false;
});

const defaultProps = {
  distros,
  running: 1,
  stopped: 2,
  total: 3,
  onNewSnapshot: vi.fn(),
  onShutdownAll: vi.fn(),
  shutdownAllPending: false,
};

describe("DistroBulkActions", () => {
  it("calls startAll.mutate with stopped distro names", () => {
    renderWithProviders(<DistroBulkActions {...defaultProps} />);
    fireEvent.click(screen.getByTestId("start-all"));
    expect(mockMutate).toHaveBeenCalledWith(["Debian", "Alpine"]);
  });

  it("disables Start All when no stopped distros", () => {
    renderWithProviders(
      <DistroBulkActions
        {...defaultProps}
        distros={[makeDistro({ state: "Running" })]}
        stopped={0}
      />,
    );
    expect(screen.getByTestId("start-all")).toBeDisabled();
  });

  it("calls onShutdownAll when Shutdown All clicked", () => {
    const onShutdownAll = vi.fn();
    renderWithProviders(<DistroBulkActions {...defaultProps} onShutdownAll={onShutdownAll} />);
    fireEvent.click(screen.getByTestId("stop-all"));
    expect(onShutdownAll).toHaveBeenCalledOnce();
  });

  it("disables Shutdown All when running is 0", () => {
    renderWithProviders(<DistroBulkActions {...defaultProps} running={0} />);
    expect(screen.getByTestId("stop-all")).toBeDisabled();
  });

  it("calls onNewSnapshot when New Snapshot clicked", () => {
    const onNewSnapshot = vi.fn();
    renderWithProviders(<DistroBulkActions {...defaultProps} onNewSnapshot={onNewSnapshot} />);
    fireEvent.click(screen.getByTestId("new-snapshot"));
    expect(onNewSnapshot).toHaveBeenCalledOnce();
  });
});
