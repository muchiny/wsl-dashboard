import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { SwapChart } from "./swap-chart";
import type { MetricsPoint } from "../hooks/use-metrics-history";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

function makePoint(overrides: Partial<MetricsPoint> = {}): MetricsPoint {
  return {
    time: "12:00",
    cpu: 50,
    memUsed: 4_000_000_000,
    memTotal: 8_000_000_000,
    memPercent: 50,
    diskPercent: 40,
    netRx: 1000,
    netTx: 500,
    ...overrides,
  };
}

describe("SwapChart", () => {
  it("shows loading skeleton when data is empty", () => {
    const { container } = renderWithProviders(<SwapChart data={[]} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays the title", () => {
    renderWithProviders(<SwapChart data={[]} />);
    expect(screen.getByText("Swap Usage")).toBeInTheDocument();
  });

  it("shows swap percentage when data is available", () => {
    const data = [makePoint({ swapPercent: 42.3 })];
    renderWithProviders(<SwapChart data={data} />);
    expect(screen.getByText("42.3%")).toBeInTheDocument();
  });

  it("renders chart when data is available", () => {
    const data = [makePoint({ swapPercent: 10 }), makePoint({ time: "12:01", swapPercent: 20 })];
    renderWithProviders(<SwapChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("does not render chart when data is empty", () => {
    renderWithProviders(<SwapChart data={[]} />);
    expect(screen.queryByTestId("responsive-container")).not.toBeInTheDocument();
  });

  it("has accessible chart label", () => {
    renderWithProviders(<SwapChart data={[]} />);
    expect(screen.getByLabelText("Swap usage chart")).toBeInTheDocument();
  });

  it("handles undefined swapPercent gracefully", () => {
    const data = [makePoint({ swapPercent: undefined })];
    renderWithProviders(<SwapChart data={data} />);
    // Should not show header value when swap is null/undefined
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows 0% swap value", () => {
    const data = [makePoint({ swapPercent: 0 })];
    renderWithProviders(<SwapChart data={data} />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});
