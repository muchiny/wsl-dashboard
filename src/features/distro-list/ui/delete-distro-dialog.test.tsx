import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DeleteDistroDialog } from "./delete-distro-dialog";

const mockMutate = vi.fn();
let mockIsPending = false;
let mockIsError = false;
const mockError = { message: "Delete failed" };

vi.mock("../api/mutations", () => ({
  useDeleteDistro: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
    isError: mockIsError,
    error: mockError,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPending = false;
  mockIsError = false;
});

const defaultProps = {
  open: true,
  distroName: "Ubuntu",
  onClose: vi.fn(),
};

describe("DeleteDistroDialog", () => {
  it("renders dialog title and warning with distro name", () => {
    renderWithProviders(<DeleteDistroDialog {...defaultProps} />);
    expect(screen.getByText(/Ubuntu/)).toBeInTheDocument();
  });

  it("has delete snapshots checkbox unchecked by default", () => {
    renderWithProviders(<DeleteDistroDialog {...defaultProps} />);
    const checkbox = screen.getByTestId("delete-snapshots-checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("toggles delete snapshots checkbox", () => {
    renderWithProviders(<DeleteDistroDialog {...defaultProps} />);
    const checkbox = screen.getByTestId("delete-snapshots-checkbox") as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("calls mutate on submit", () => {
    renderWithProviders(<DeleteDistroDialog {...defaultProps} />);
    const submitBtn = screen.getByTestId("delete-distro-submit");
    fireEvent.click(submitBtn);
    expect(mockMutate).toHaveBeenCalledWith(
      { name: "Ubuntu", deleteSnapshots: false },
      expect.any(Object),
    );
  });

  it("calls mutate with deleteSnapshots true when checked", () => {
    renderWithProviders(<DeleteDistroDialog {...defaultProps} />);
    fireEvent.click(screen.getByTestId("delete-snapshots-checkbox"));
    fireEvent.click(screen.getByTestId("delete-distro-submit"));
    expect(mockMutate).toHaveBeenCalledWith(
      { name: "Ubuntu", deleteSnapshots: true },
      expect.any(Object),
    );
  });

  it("disables submit button when pending", () => {
    mockIsPending = true;
    renderWithProviders(<DeleteDistroDialog {...defaultProps} />);
    expect(screen.getByTestId("delete-distro-submit")).toBeDisabled();
  });

  it("shows error message when mutation fails", () => {
    mockIsError = true;
    renderWithProviders(<DeleteDistroDialog {...defaultProps} />);
    expect(screen.getByText("Delete failed")).toBeInTheDocument();
  });
});
