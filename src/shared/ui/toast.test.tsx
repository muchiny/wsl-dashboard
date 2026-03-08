import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { type Toast, useToastStore } from "./toast-store";
import { ToastContainer } from "./toast";

vi.mock("./toast-store", () => ({
  useToastStore: vi.fn(),
}));

const mockToast: Toast = { id: "1", message: "Test message", variant: "success", duration: 3000 };

const mockDismiss = vi.fn();

function setupMock(toasts: Toast[] = []) {
  vi.mocked(useToastStore).mockImplementation((selector: unknown) => {
    const state = { toasts, dismiss: mockDismiss };
    return (selector as (s: typeof state) => unknown)(state);
  });
}

describe("ToastContainer", () => {
  beforeEach(() => {
    mockDismiss.mockClear();
  });

  it("renders nothing when no toasts", () => {
    setupMock([]);
    const { container } = renderWithProviders(<ToastContainer />);
    expect(container.innerHTML).toBe("");
  });

  it("renders toast items when toasts exist", () => {
    setupMock([
      mockToast,
      { id: "2", message: "Another message", variant: "error" as const, duration: 6000 },
    ]);
    renderWithProviders(<ToastContainer />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByText("Another message")).toBeInTheDocument();
  });

  it("each toast has role='alert'", () => {
    setupMock([
      mockToast,
      { id: "2", message: "Second", variant: "info" as const, duration: 4000 },
    ]);
    renderWithProviders(<ToastContainer />);
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("dismiss button calls dismiss from store", () => {
    setupMock([mockToast]);
    renderWithProviders(<ToastContainer />);
    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(mockDismiss).toHaveBeenCalledWith("1");
  });

  it("has aria-live='polite' container", () => {
    setupMock([mockToast]);
    renderWithProviders(<ToastContainer />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it("renders all four variants", () => {
    setupMock([
      { id: "1", message: "ok", variant: "success" as const, duration: 4000 },
      { id: "2", message: "fail", variant: "error" as const, duration: 6000 },
      { id: "3", message: "caution", variant: "warning" as const, duration: 5000 },
      { id: "4", message: "fyi", variant: "info" as const, duration: 4000 },
    ]);
    renderWithProviders(<ToastContainer />);
    expect(screen.getAllByRole("alert")).toHaveLength(4);
  });
});
