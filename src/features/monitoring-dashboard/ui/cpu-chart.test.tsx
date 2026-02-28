import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { CpuChart } from "./cpu-chart";
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

describe("CpuChart", () => {
  it("shows loading skeleton when data is empty", () => {
    const { container } = renderWithProviders(<CpuChart data={[]} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays the title", () => {
    renderWithProviders(<CpuChart data={[]} />);
    expect(screen.getByText("CPU Usage")).toBeInTheDocument();
  });

  it("shows latest CPU percentage when data is available", () => {
    const data = [makePoint({ cpu: 72.3 })];
    renderWithProviders(<CpuChart data={data} />);
    expect(screen.getByText("72.3%")).toBeInTheDocument();
  });

  it("renders chart when data is available", () => {
    const data = [makePoint(), makePoint({ time: "12:01", cpu: 60 })];
    renderWithProviders(<CpuChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("does not render chart when data is empty", () => {
    renderWithProviders(<CpuChart data={[]} />);
    expect(screen.queryByTestId("responsive-container")).not.toBeInTheDocument();
  });

  it("shows load average when provided", () => {
    renderWithProviders(<CpuChart data={[makePoint()]} loadAverage={[1.5, 2.3, 3.1]} />);
    expect(screen.getByText(/1\.50/)).toBeInTheDocument();
    expect(screen.getByText(/2\.30/)).toBeInTheDocument();
    expect(screen.getByText(/3\.10/)).toBeInTheDocument();
  });

  it("does not show load average when not provided", () => {
    renderWithProviders(<CpuChart data={[makePoint()]} />);
    expect(screen.queryByText("Load")).not.toBeInTheDocument();
  });

  it("has accessible chart label", () => {
    renderWithProviders(<CpuChart data={[]} />);
    expect(screen.getByLabelText("CPU usage chart")).toBeInTheDocument();
  });
});
