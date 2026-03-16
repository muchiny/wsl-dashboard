import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DiskIoChart } from "./disk-io-chart";
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

describe("DiskIoChart", () => {
  it("shows loading skeleton when data is empty", () => {
    const { container } = renderWithProviders(<DiskIoChart data={[]} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays the title", () => {
    renderWithProviders(<DiskIoChart data={[]} />);
    expect(screen.getByText("Disk I/O")).toBeInTheDocument();
  });

  it("renders chart when data is available", () => {
    const data = [
      makePoint({ diskReadRate: 1024, diskWriteRate: 512 }),
      makePoint({ time: "12:01", diskReadRate: 2048, diskWriteRate: 1024 }),
    ];
    renderWithProviders(<DiskIoChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("shows read/write rates in header", () => {
    const data = [makePoint({ diskReadRate: 1_048_576, diskWriteRate: 524_288 })];
    renderWithProviders(<DiskIoChart data={data} />);
    expect(screen.getByText(/Read/)).toBeInTheDocument();
    expect(screen.getByText(/Write/)).toBeInTheDocument();
  });

  it("handles zero disk I/O rates", () => {
    const data = [makePoint({ diskReadRate: 0, diskWriteRate: 0 })];
    renderWithProviders(<DiskIoChart data={data} />);
    expect(screen.getByText(/Read/)).toBeInTheDocument();
  });

  it("handles undefined disk I/O rates", () => {
    const data = [makePoint()]; // No diskReadRate/diskWriteRate
    renderWithProviders(<DiskIoChart data={data} />);
    // Should not crash, shows 0 B/s
    expect(screen.getByText(/Read/)).toBeInTheDocument();
  });

  it("has accessible chart label", () => {
    renderWithProviders(<DiskIoChart data={[]} />);
    expect(screen.getByLabelText("Disk I/O chart")).toBeInTheDocument();
  });
});
