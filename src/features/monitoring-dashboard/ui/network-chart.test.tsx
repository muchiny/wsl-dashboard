import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { NetworkChart } from "./network-chart";
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
  Legend: () => <div data-testid="legend" />,
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

describe("NetworkChart", () => {
  it("shows loading skeleton when data is empty", () => {
    const { container } = renderWithProviders(<NetworkChart data={[]} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays the title", () => {
    renderWithProviders(<NetworkChart data={[]} />);
    expect(screen.getByText("Network I/O")).toBeInTheDocument();
  });

  it("shows calculating when only one data point with zero values", () => {
    const data = [makePoint({ netRx: 0, netTx: 0 })];
    renderWithProviders(<NetworkChart data={data} />);
    expect(screen.getByText("Calculating...")).toBeInTheDocument();
  });

  it("shows RX/TX rates when sufficient data is available", () => {
    const data = [
      makePoint({ netRx: 1024, netTx: 512 }),
      makePoint({ time: "12:01", netRx: 2048, netTx: 1024 }),
    ];
    renderWithProviders(<NetworkChart data={data} />);
    // Should show rates, not "calculating"
    expect(screen.queryByText("Calculating...")).not.toBeInTheDocument();
  });

  it("renders chart when data is available", () => {
    const data = [makePoint(), makePoint({ time: "12:01" })];
    renderWithProviders(<NetworkChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("does not render chart when data is empty", () => {
    renderWithProviders(<NetworkChart data={[]} />);
    expect(screen.queryByTestId("responsive-container")).not.toBeInTheDocument();
  });

  it("has accessible chart label", () => {
    renderWithProviders(<NetworkChart data={[]} />);
    expect(screen.getByLabelText("Network I/O chart")).toBeInTheDocument();
  });
});
