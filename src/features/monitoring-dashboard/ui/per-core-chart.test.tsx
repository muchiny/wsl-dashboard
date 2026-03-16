import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { PerCoreChart } from "./per-core-chart";

describe("PerCoreChart", () => {
  it("returns null when currentValues is empty", () => {
    const { container } = renderWithProviders(
      <PerCoreChart perCoreHistory={[]} currentValues={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders collapsed by default with core count", () => {
    renderWithProviders(
      <PerCoreChart
        perCoreHistory={[
          [10, 20],
          [30, 40],
        ]}
        currentValues={[25, 35]}
      />,
    );
    expect(screen.getByText("Per-Core CPU")).toBeInTheDocument();
    expect(screen.getByText(/2 cores/)).toBeInTheDocument();
  });

  it("shows avg and max when collapsed", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[10], [80]]} currentValues={[30, 80]} />);
    // avg = 55, max = 80
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows compact bar preview when collapsed", () => {
    const { container } = renderWithProviders(
      <PerCoreChart perCoreHistory={[[10], [20], [30], [40]]} currentValues={[10, 20, 30, 40]} />,
    );
    // Should have bar preview divs (one per core)
    const bars = container.querySelectorAll(".rounded-t");
    expect(bars.length).toBe(4);
  });

  it("does not show sparkline grid when collapsed", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[10, 20]]} currentValues={[25]} />);
    // No C0 label visible when collapsed
    expect(screen.queryByText("C0")).not.toBeInTheDocument();
  });

  it("expands to show per-core sparklines on click", () => {
    renderWithProviders(
      <PerCoreChart
        perCoreHistory={[
          [10, 20],
          [30, 40],
        ]}
        currentValues={[25, 35]}
      />,
    );
    const button = screen.getByRole("button", { expanded: false });
    fireEvent.click(button);
    expect(screen.getByText("C0")).toBeInTheDocument();
    expect(screen.getByText("C1")).toBeInTheDocument();
  });

  it("hides avg/max when expanded", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[10], [80]]} currentValues={[30, 80]} />);
    fireEvent.click(screen.getByRole("button"));
    // avg/max labels should be hidden
    expect(screen.queryByText("Avg")).not.toBeInTheDocument();
  });

  it("collapses again on second click", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[10, 20]]} currentValues={[25]} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(screen.getByText("C0")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByText("C0")).not.toBeInTheDocument();
  });

  it("renders with a single core", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[50, 60, 70]]} currentValues={[70]} />);
    expect(screen.getByText(/1 cores/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("C0")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("renders with 16 cores", () => {
    const values = Array.from({ length: 16 }, (_, i) => i * 6);
    const history = values.map((v) => [v, v + 1, v + 2]);
    renderWithProviders(<PerCoreChart perCoreHistory={history} currentValues={values} />);
    expect(screen.getByText(/16 cores/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("C0")).toBeInTheDocument();
    expect(screen.getByText("C15")).toBeInTheDocument();
  });

  it("applies red color to cores at 90%+", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[95]]} currentValues={[95]} />);
    // Both avg and max show 95% — find the one with inline style (max)
    const allValues = screen.getAllByText("95%");
    const styled = allValues.find((el) => el.style.color === "var(--color-red)");
    expect(styled).toBeTruthy();
  });

  it("applies yellow color to cores at 70-89%", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[75]]} currentValues={[75]} />);
    const allValues = screen.getAllByText("75%");
    const styled = allValues.find((el) => el.style.color === "var(--color-yellow)");
    expect(styled).toBeTruthy();
  });

  it("applies blue color to cores below 70%", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[50]]} currentValues={[50]} />);
    const allValues = screen.getAllByText("50%");
    const styled = allValues.find((el) => el.style.color === "var(--color-blue)");
    expect(styled).toBeTruthy();
  });

  it("handles missing perCoreHistory entries gracefully", () => {
    // 3 cores but only 1 history entry
    renderWithProviders(<PerCoreChart perCoreHistory={[[10, 20]]} currentValues={[25, 35, 45]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("C0")).toBeInTheDocument();
    expect(screen.getByText("C1")).toBeInTheDocument();
    expect(screen.getByText("C2")).toBeInTheDocument();
  });

  it("has proper aria-expanded attribute", () => {
    renderWithProviders(<PerCoreChart perCoreHistory={[[10]]} currentValues={[25]} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("shows all zero values correctly", () => {
    renderWithProviders(
      <PerCoreChart
        perCoreHistory={[
          [0, 0],
          [0, 0],
        ]}
        currentValues={[0, 0]}
      />,
    );
    // Both avg and max show 0%
    const allZeros = screen.getAllByText("0%");
    expect(allZeros.length).toBeGreaterThanOrEqual(2);
  });
});
