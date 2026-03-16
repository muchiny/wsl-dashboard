import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { TcpConnectionsPanel } from "./tcp-connections-panel";
import type { MetricsPoint } from "../hooks/use-metrics-history";

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

describe("TcpConnectionsPanel", () => {
  it("renders title", () => {
    renderWithProviders(<TcpConnectionsPanel data={[]} />);
    expect(screen.getByText("TCP Connections")).toBeInTheDocument();
  });

  it("shows all three stat categories", () => {
    renderWithProviders(<TcpConnectionsPanel data={[]} />);
    expect(screen.getByText("Established")).toBeInTheDocument();
    expect(screen.getByText("TIME_WAIT")).toBeInTheDocument();
    expect(screen.getByText("Listen")).toBeInTheDocument();
  });

  it("shows zero values when data is empty", () => {
    renderWithProviders(<TcpConnectionsPanel data={[]} />);
    expect(screen.getAllByText("0").length).toBe(3);
  });

  it("displays TCP connection counts from latest data point", () => {
    const data = [
      makePoint({ tcpEstablished: 10, tcpTimeWait: 5, tcpListen: 3 }),
      makePoint({ time: "12:01", tcpEstablished: 42, tcpTimeWait: 7, tcpListen: 2 }),
    ];
    renderWithProviders(<TcpConnectionsPanel data={data} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("handles missing TCP data (defaults to 0)", () => {
    const data = [makePoint()]; // No TCP fields
    renderWithProviders(<TcpConnectionsPanel data={data} />);
    expect(screen.getAllByText("0").length).toBe(3);
  });

  it("shows large connection counts", () => {
    const data = [makePoint({ tcpEstablished: 1500, tcpTimeWait: 300, tcpListen: 25 })];
    renderWithProviders(<TcpConnectionsPanel data={data} />);
    expect(screen.getByText("1500")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });
});
