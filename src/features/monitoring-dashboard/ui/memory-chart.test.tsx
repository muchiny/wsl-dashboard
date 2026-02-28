import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { MemoryChart } from "./memory-chart";
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

describe("MemoryChart", () => {
  it("shows loading skeleton when data is empty", () => {
    const { container } = renderWithProviders(<MemoryChart data={[]} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays the title", () => {
    renderWithProviders(<MemoryChart data={[]} />);
    expect(screen.getByText("Memory Usage")).toBeInTheDocument();
  });

  it("shows latest memory percentage when data is available", () => {
    const data = [makePoint({ memPercent: 65.7 })];
    renderWithProviders(<MemoryChart data={data} />);
    expect(screen.getByText("65.7%")).toBeInTheDocument();
  });

  it("shows memory usage in bytes", () => {
    const data = [makePoint({ memUsed: 4_000_000_000, memTotal: 8_000_000_000 })];
    renderWithProviders(<MemoryChart data={data} />);
    expect(screen.getByText(/3\.73 GB/)).toBeInTheDocument();
    expect(screen.getByText(/7\.45 GB/)).toBeInTheDocument();
  });

  it("renders chart when data is available", () => {
    const data = [makePoint(), makePoint({ time: "12:01", memPercent: 60 })];
    renderWithProviders(<MemoryChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("does not render chart when data is empty", () => {
    renderWithProviders(<MemoryChart data={[]} />);
    expect(screen.queryByTestId("responsive-container")).not.toBeInTheDocument();
  });

  it("has accessible chart label", () => {
    renderWithProviders(<MemoryChart data={[]} />);
    expect(screen.getByLabelText("Memory usage chart")).toBeInTheDocument();
  });
});
