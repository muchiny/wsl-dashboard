import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { ChartPanel } from "./chart-panel";
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

const defaultProps = {
  title: "Test Chart",
  data: [] as MetricsPoint[],
  ariaLabel: "Test chart area",
  areas: [{ dataKey: "cpu", color: "#ff0000", gradientId: "cpuGrad" }],
  tooltipFormatter: (v: number | undefined, n: string | undefined) =>
    [`${v}%`, n ?? ""] as [string, string],
};

describe("ChartPanel", () => {
  it("renders the title", () => {
    renderWithProviders(<ChartPanel {...defaultProps} />);
    expect(screen.getByText("Test Chart")).toBeInTheDocument();
  });

  it("renders children skeleton when data is empty", () => {
    const { container } = renderWithProviders(<ChartPanel {...defaultProps} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders chart when data is provided", () => {
    const point: MetricsPoint = {
      time: "12:00",
      cpu: 50,
      memUsed: 4_000_000_000,
      memTotal: 8_000_000_000,
      memPercent: 50,
      diskPercent: 40,
      netRx: 1000,
      netTx: 500,
    };
    renderWithProviders(<ChartPanel {...defaultProps} data={[point]} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    renderWithProviders(<ChartPanel {...defaultProps} />);
    expect(screen.getByLabelText("Test chart area")).toBeInTheDocument();
  });

  it("renders headerValue when provided", () => {
    renderWithProviders(
      <ChartPanel {...defaultProps} headerValue={<span>42%</span>} />,
    );
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    renderWithProviders(
      <ChartPanel {...defaultProps} subtitle={<span>Extra info</span>} />,
    );
    expect(screen.getByText("Extra info")).toBeInTheDocument();
  });
});
