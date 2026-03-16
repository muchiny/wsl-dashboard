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

  it("shows rates for single point with non-zero values", () => {
    const data = [makePoint({ netRx: 1048576, netTx: 524288 })];
    renderWithProviders(<NetworkChart data={data} />);
    expect(screen.queryByText("Calculating...")).not.toBeInTheDocument();
  });

  // ── TCP inline tests ──

  it("does not show TCP badges when showTcp is false", () => {
    const data = [makePoint({ tcpEstablished: 10, tcpTimeWait: 5, tcpListen: 3 })];
    renderWithProviders(<NetworkChart data={data} />);
    expect(screen.queryByText("Established")).not.toBeInTheDocument();
  });

  it("does not show TCP badges when showTcp is true but all values are zero", () => {
    const data = [makePoint({ tcpEstablished: 0, tcpTimeWait: 0, tcpListen: 0 })];
    renderWithProviders(<NetworkChart data={data} showTcp />);
    expect(screen.queryByText("Established")).not.toBeInTheDocument();
  });

  it("shows TCP badges when showTcp is true and values are non-zero", () => {
    const data = [makePoint({ tcpEstablished: 42, tcpTimeWait: 7, tcpListen: 3 })];
    renderWithProviders(<NetworkChart data={data} showTcp />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText(/Established/)).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/TIME_WAIT/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/Listen/)).toBeInTheDocument();
  });

  it("shows TCP badges from the latest data point", () => {
    const data = [
      makePoint({ tcpEstablished: 10, tcpTimeWait: 2, tcpListen: 1 }),
      makePoint({ time: "12:01", tcpEstablished: 20, tcpTimeWait: 5, tcpListen: 3 }),
    ];
    renderWithProviders(<NetworkChart data={data} showTcp />);
    // Should use latest (second) point — check for the combined badge text
    expect(screen.getByText(/20\s+Established/)).toBeInTheDocument();
    expect(screen.getByText(/5\s+TIME_WAIT/)).toBeInTheDocument();
  });

  it("handles missing TCP data gracefully with showTcp", () => {
    const data = [makePoint()]; // No TCP fields
    renderWithProviders(<NetworkChart data={data} showTcp />);
    // Should not crash, TCP badges should not appear (defaults to 0)
    expect(screen.queryByText("Established")).not.toBeInTheDocument();
  });

  it("shows TCP badges when only one TCP field is non-zero", () => {
    const data = [makePoint({ tcpEstablished: 5, tcpTimeWait: 0, tcpListen: 0 })];
    renderWithProviders(<NetworkChart data={data} showTcp />);
    expect(screen.getByText(/Established/)).toBeInTheDocument();
  });
});
