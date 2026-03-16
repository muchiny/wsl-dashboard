import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistroFilterBar } from "./distro-filter-bar";

const mockSetSortKey = vi.fn();
vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ sortKey: "name-asc", setSortKey: mockSetSortKey }),
}));

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  statusFilter: "all" as const,
  onStatusFilterChange: vi.fn(),
  wslVersionFilter: "all" as const,
  onWslVersionFilterChange: vi.fn(),
};

describe("DistroFilterBar", () => {
  it("renders status filter pills", () => {
    renderWithProviders(<DistroFilterBar {...defaultProps} />);
    expect(screen.getByTestId("filter-status-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-status-running")).toBeInTheDocument();
    expect(screen.getByTestId("filter-status-stopped")).toBeInTheDocument();
  });

  it("calls onStatusFilterChange when status pill clicked", () => {
    const onStatusFilterChange = vi.fn();
    renderWithProviders(
      <DistroFilterBar {...defaultProps} onStatusFilterChange={onStatusFilterChange} />,
    );
    fireEvent.click(screen.getByTestId("filter-status-running"));
    expect(onStatusFilterChange).toHaveBeenCalledWith("running");
  });

  it("renders WSL version filter pills", () => {
    renderWithProviders(<DistroFilterBar {...defaultProps} />);
    expect(screen.getByTestId("filter-wsl-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-wsl-1")).toBeInTheDocument();
    expect(screen.getByTestId("filter-wsl-2")).toBeInTheDocument();
  });

  it("calls onWslVersionFilterChange when WSL pill clicked", () => {
    const onWslVersionFilterChange = vi.fn();
    renderWithProviders(
      <DistroFilterBar {...defaultProps} onWslVersionFilterChange={onWslVersionFilterChange} />,
    );
    fireEvent.click(screen.getByTestId("filter-wsl-2"));
    expect(onWslVersionFilterChange).toHaveBeenCalledWith(2);
  });

  it("opens sort dropdown and shows options", () => {
    renderWithProviders(<DistroFilterBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("sort-dropdown"));
    expect(screen.getByTestId("sort-option-name-asc")).toBeInTheDocument();
    expect(screen.getByTestId("sort-option-vhdx-size")).toBeInTheDocument();
  });

  it("calls setSortKey when sort option selected", () => {
    renderWithProviders(<DistroFilterBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("sort-dropdown"));
    fireEvent.click(screen.getByTestId("sort-option-name-desc"));
    expect(mockSetSortKey).toHaveBeenCalledWith("name-desc");
  });
});
