import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistrosToolbar } from "./distros-toolbar";
import type { Distro } from "@/shared/types/distro";

vi.mock("../api/queries", () => ({
  useDistros: () => ({ isFetching: false }),
  distroKeys: { list: () => ["distros"] },
}));

const mockStartAllMutate = vi.fn();
vi.mock("../api/mutations", () => ({
  useStartAll: () => ({
    mutate: mockStartAllMutate,
    isPending: false,
  }),
}));

const mockSetViewMode = vi.fn();
const mockSetSortKey = vi.fn();
vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: () => ({
    sortKey: "name-asc",
    setSortKey: mockSetSortKey,
    viewMode: "grid",
    setViewMode: mockSetViewMode,
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
    last_seen: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const noop = () => {};

const defaultProps = {
  searchQuery: "",
  onSearchChange: noop,
  statusFilter: "all" as const,
  onStatusFilterChange: noop,
  wslVersionFilter: "all" as const,
  onWslVersionFilterChange: noop,
  distros: [] as Distro[],
  onNewSnapshot: noop,
  onShutdownAll: noop,
  shutdownAllPending: false,
  running: 0,
  stopped: 0,
  total: 0,
};

describe("DistrosToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays distro counts", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} total={5} running={3} stopped={2} />);
    expect(screen.getByText("5 distros")).toBeInTheDocument();
    expect(screen.getByText("3 up")).toBeInTheDocument();
    expect(screen.getByText("2 off")).toBeInTheDocument();
  });

  it("renders search input with placeholder", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search distributions...")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing in search input", () => {
    const onSearchChange = vi.fn();
    renderWithProviders(<DistrosToolbar {...defaultProps} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByPlaceholderText("Search distributions..."), {
      target: { value: "Ubu" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("Ubu");
  });

  it("shows clear button when search query is non-empty", () => {
    const onSearchChange = vi.fn();
    renderWithProviders(
      <DistrosToolbar {...defaultProps} searchQuery="test" onSearchChange={onSearchChange} />,
    );
    // There should be a clear (X) button
    const clearButtons = screen.getAllByRole("button");
    // Click the X button inside the search input area
    const xButton = clearButtons.find((btn) => btn.querySelector(".h-3\\.5.w-3\\.5"));
    expect(xButton).toBeTruthy();
  });

  it("renders status filter pills", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    // "All" appears multiple times (status + WSL version), use getAllByText
    expect(screen.getAllByText("All").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("calls onStatusFilterChange when a status pill is clicked", () => {
    const onStatusFilterChange = vi.fn();
    renderWithProviders(
      <DistrosToolbar {...defaultProps} onStatusFilterChange={onStatusFilterChange} />,
    );
    fireEvent.click(screen.getByText("Running"));
    expect(onStatusFilterChange).toHaveBeenCalledWith("running");
  });

  it("renders WSL version filter pills", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    expect(screen.getByText("WSL 1")).toBeInTheDocument();
    expect(screen.getByText("WSL 2")).toBeInTheDocument();
  });

  it("calls onWslVersionFilterChange when a WSL pill is clicked", () => {
    const onWslVersionFilterChange = vi.fn();
    renderWithProviders(
      <DistrosToolbar {...defaultProps} onWslVersionFilterChange={onWslVersionFilterChange} />,
    );
    fireEvent.click(screen.getByText("WSL 2"));
    expect(onWslVersionFilterChange).toHaveBeenCalledWith(2);
  });

  it("renders grid and list view toggle buttons", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
    expect(screen.getByLabelText("List view")).toBeInTheDocument();
  });

  it("calls setViewMode when view toggle is clicked", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("List view"));
    expect(mockSetViewMode).toHaveBeenCalledWith("list");
  });

  it("renders bulk action buttons", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    expect(screen.getByText("Start All")).toBeInTheDocument();
    expect(screen.getByText("Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Stop All")).toBeInTheDocument();
  });

  it("disables start all button when no stopped distros", () => {
    renderWithProviders(
      <DistrosToolbar {...defaultProps} distros={[makeDistro({ state: "Running" })]} />,
    );
    expect(screen.getByText("Start All").closest("button")).toBeDisabled();
  });

  it("enables start all button when stopped distros exist", () => {
    renderWithProviders(
      <DistrosToolbar
        {...defaultProps}
        distros={[makeDistro({ state: "Stopped", name: "Alpine" })]}
      />,
    );
    expect(screen.getByText("Start All").closest("button")).not.toBeDisabled();
  });

  it("calls onNewSnapshot when snapshot button is clicked", () => {
    const onNewSnapshot = vi.fn();
    renderWithProviders(<DistrosToolbar {...defaultProps} onNewSnapshot={onNewSnapshot} />);
    fireEvent.click(screen.getByText("Snapshot"));
    expect(onNewSnapshot).toHaveBeenCalledOnce();
  });

  it("disables shutdown all when no running distros", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} running={0} />);
    expect(screen.getByText("Stop All").closest("button")).toBeDisabled();
  });

  it("calls onShutdownAll when shutdown button is clicked", () => {
    const onShutdownAll = vi.fn();
    renderWithProviders(
      <DistrosToolbar {...defaultProps} running={2} onShutdownAll={onShutdownAll} />,
    );
    fireEvent.click(screen.getByText("Stop All"));
    expect(onShutdownAll).toHaveBeenCalledOnce();
  });

  it("shows pending text for shutdown when shutdownAllPending", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} running={2} shutdownAllPending={true} />);
    expect(screen.getByText("Stopping...")).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    expect(screen.getByLabelText("Refresh distributions")).toBeInTheDocument();
  });

  it("opens sort dropdown when sort button is clicked", () => {
    renderWithProviders(<DistrosToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText("Name (A-Z)"));
    expect(screen.getByText("Name (Z-A)")).toBeInTheDocument();
    expect(screen.getByText("Running first")).toBeInTheDocument();
    expect(screen.getByText("Disk size")).toBeInTheDocument();
  });
});
