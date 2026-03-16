import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { KpiBanner } from "./kpi-banner";
import type { MetricsPoint } from "../hooks/use-metrics-history";
import type { SystemMetrics } from "@/shared/types/monitoring";

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
    swapPercent: 10,
    ...overrides,
  };
}

function makeSystemMetrics(overrides: Partial<SystemMetrics> = {}): SystemMetrics {
  return {
    distro_name: "Ubuntu",
    timestamp: "2026-01-01T00:00:00Z",
    cpu: { usage_percent: 50, per_core: [40, 60], load_average: [1.2, 0.8, 0.5] },
    memory: {
      total_bytes: 8_000_000_000,
      used_bytes: 4_000_000_000,
      available_bytes: 4_000_000_000,
      cached_bytes: 1_000_000_000,
      swap_total_bytes: 2_000_000_000,
      swap_used_bytes: 200_000_000,
    },
    disk: {
      total_bytes: 100_000_000_000,
      used_bytes: 40_000_000_000,
      available_bytes: 60_000_000_000,
      usage_percent: 40,
    },
    network: { interfaces: [] },
    ...overrides,
  };
}

describe("KpiBanner", () => {
  it("renders all 5 KPI cards", () => {
    const data = [makePoint(), makePoint({ time: "12:01" })];
    renderWithProviders(<KpiBanner data={data} latestMetrics={makeSystemMetrics()} />);

    expect(screen.getByText("CPU Usage")).toBeInTheDocument();
    expect(screen.getByText("Memory Usage")).toBeInTheDocument();
    expect(screen.getByText("Disk Usage")).toBeInTheDocument();
    expect(screen.getByText("Swap")).toBeInTheDocument();
    expect(screen.getByText("Network I/O")).toBeInTheDocument();
  });

  it("displays current CPU percentage inside gauge", () => {
    const data = [makePoint({ cpu: 73.5 })];
    renderWithProviders(<KpiBanner data={data} latestMetrics={makeSystemMetrics()} />);
    // Rounded to integer inside ring gauge
    expect(screen.getByText("74%")).toBeInTheDocument();
  });

  it("displays current memory percentage inside gauge", () => {
    const data = [makePoint({ memPercent: 62.3 })];
    renderWithProviders(<KpiBanner data={data} latestMetrics={makeSystemMetrics()} />);
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("displays disk free space from latestMetrics", () => {
    const data = [makePoint()];
    renderWithProviders(<KpiBanner data={data} latestMetrics={makeSystemMetrics()} />);
    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });

  it("displays load average from latestMetrics", () => {
    const data = [makePoint()];
    renderWithProviders(<KpiBanner data={data} latestMetrics={makeSystemMetrics()} />);
    expect(screen.getByText(/LA 1.2/)).toBeInTheDocument();
  });

  it("handles empty data gracefully", () => {
    renderWithProviders(<KpiBanner data={[]} latestMetrics={null} />);
    // Should still render with 0% values inside gauges
    expect(screen.getByText("CPU Usage")).toBeInTheDocument();
    expect(screen.getAllByText("0%").length).toBeGreaterThanOrEqual(4);
  });

  it("handles null latestMetrics gracefully", () => {
    const data = [makePoint()];
    renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    expect(screen.getByText("CPU Usage")).toBeInTheDocument();
    // No load average or disk free subtitle when latestMetrics is null
    expect(screen.queryByText(/LA/)).not.toBeInTheDocument();
  });

  it("shows network calculating state with single zero-value point", () => {
    const data = [makePoint({ netRx: 0, netTx: 0 })];
    renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("shows network RX rate with valid data", () => {
    const data = [
      makePoint({ netRx: 1024, netTx: 512 }),
      makePoint({ time: "12:01", netRx: 2048, netTx: 1024 }),
    ];
    renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    // Should show formatted bytes/s for the latest point (multiple /s elements: value + subtitle)
    const rateElements = screen.getAllByText(/\/s/);
    expect(rateElements.length).toBeGreaterThanOrEqual(1);
  });

  it("applies warning color for high CPU in gauge", () => {
    const data = [makePoint({ cpu: 85 })];
    const { container } = renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    // 85% CPU should trigger yellow stroke on the fill circle (2nd circle in first gauge SVG)
    const firstCard = container.querySelectorAll(".bg-surface-0\\/50")[0]!;
    const fillCircle = firstCard.querySelectorAll("circle")[1]!;
    expect(fillCircle.getAttribute("stroke")).toBe("var(--color-yellow)");
  });

  it("applies critical color for very high CPU in gauge", () => {
    const data = [makePoint({ cpu: 95 })];
    const { container } = renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    const firstCard = container.querySelectorAll(".bg-surface-0\\/50")[0]!;
    const fillCircle = firstCard.querySelectorAll("circle")[1]!;
    expect(fillCircle.getAttribute("stroke")).toBe("var(--color-red)");
  });

  it("applies normal color for low CPU in gauge", () => {
    const data = [makePoint({ cpu: 30 })];
    const { container } = renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    const firstCard = container.querySelectorAll(".bg-surface-0\\/50")[0]!;
    const fillCircle = firstCard.querySelectorAll("circle")[1]!;
    expect(fillCircle.getAttribute("stroke")).toBe("var(--color-blue)");
  });

  it("shows swap percentage inside gauge", () => {
    const data = [makePoint({ swapPercent: 25.5 })];
    renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    // Rounded to integer inside ring gauge
    expect(screen.getByText("26%")).toBeInTheDocument();
  });

  it("handles undefined swapPercent in data points", () => {
    const data = [makePoint({ swapPercent: undefined })];
    renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    // Swap should show 0.0% when undefined
    expect(screen.getByText("Swap")).toBeInTheDocument();
  });

  // ── Ring gauge tests ──

  it("renders ring gauges for metric cards", () => {
    const data = [makePoint()];
    const { container } = renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    // 4 gauge cards (CPU, Memory, Disk, Swap) should each have an SVG with 2 circle elements
    const gauges = container.querySelectorAll("svg circle");
    // 4 gauges x 2 circles each = 8
    expect(gauges.length).toBe(8);
  });

  it("renders fallback icon for Network card (no ring gauge)", () => {
    const data = [makePoint()];
    const { container } = renderWithProviders(<KpiBanner data={data} latestMetrics={null} />);
    // 5 KPI cards total, but only 4 have ring gauges (circle elements)
    const cards = container.querySelectorAll(".bg-surface-0\\/50");
    const lastCard = cards[cards.length - 1]!;
    // Network card has no circle elements (uses Wifi icon instead)
    expect(lastCard.querySelector("circle")).toBeNull();
  });

  it("does not render progress bars", () => {
    const data = [makePoint()];
    const { container } = renderWithProviders(
      <KpiBanner data={data} latestMetrics={makeSystemMetrics()} />,
    );
    expect(container.querySelector(".h-1")).toBeNull();
  });
});
