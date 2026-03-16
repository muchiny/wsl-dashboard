import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistroSearchBar } from "./distro-search-bar";

vi.mock("../../api/queries", () => ({
  useDistros: () => ({ isFetching: false }),
  distroKeys: { list: () => ["distros", "list"] },
}));

const mockSetViewMode = vi.fn();
vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ viewMode: "grid", setViewMode: mockSetViewMode }),
}));

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  searchQuery: "",
  onSearchChange: vi.fn(),
};

describe("DistroSearchBar", () => {
  it("renders search input", () => {
    renderWithProviders(<DistroSearchBar {...defaultProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", () => {
    const onSearchChange = vi.fn();
    renderWithProviders(<DistroSearchBar {...defaultProps} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  it("shows clear button when searchQuery is non-empty", () => {
    const { container } = renderWithProviders(
      <DistroSearchBar {...defaultProps} searchQuery="test" />,
    );
    // Clear button is a sibling of the input inside the relative div
    const clearButtons = container.querySelectorAll("button");
    // At least one button should exist inside the search area (the X clear button)
    const clearButton = Array.from(clearButtons).find((btn) => btn.closest(".relative"));
    expect(clearButton).toBeTruthy();
  });

  it("calls setViewMode when grid/list buttons clicked", () => {
    renderWithProviders(<DistroSearchBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /list/i }));
    expect(mockSetViewMode).toHaveBeenCalledWith("list");
  });

  it("renders refresh button", () => {
    renderWithProviders(<DistroSearchBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });
});
