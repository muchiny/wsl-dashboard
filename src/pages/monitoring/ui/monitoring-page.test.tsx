import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { useDistros } from "@/shared/api/distro-queries";
import { useProcesses } from "@/features/monitoring-dashboard/api/queries";
import { MonitoringPage } from "./monitoring-page";

vi.mock("@/shared/api/distro-queries", () => ({ useDistros: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useSearch: vi.fn(() => ({})),
}));
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});
vi.mock("@/features/monitoring-dashboard/api/queries", () => ({
  useProcesses: vi.fn(() => ({ data: null })),
  useMetricsHistory: vi.fn(() => ({ data: null })),
  monitoringKeys: { all: ["monitoring"] },
  useAlertThresholds: vi.fn(() => ({ data: [] })),
  useSetAlertThresholds: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock("@/features/monitoring-dashboard/hooks/use-live-metrics", () => ({
  useLiveMetrics: vi.fn(() => ({ history: [], latestMetrics: null })),
}));
vi.mock("@/features/monitoring-dashboard/ui/alert-badge", () => ({
  AlertBadge: () => null,
}));
vi.mock("@/features/monitoring-dashboard/ui/cpu-chart", () => ({
  CpuChart: () => <div data-testid="cpu-chart" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/memory-chart", () => ({
  MemoryChart: () => <div data-testid="memory-chart" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/network-chart", () => ({
  NetworkChart: () => <div data-testid="network-chart" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/disk-gauge", () => ({
  DiskGauge: () => <div data-testid="disk-gauge" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/process-table", () => ({
  ProcessTable: () => <div data-testid="process-table" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/time-range-picker", () => ({
  TimeRangePicker: () => <div data-testid="time-range-picker" />,
}));
vi.mock("@/shared/ui/select", () => ({
  Select: () => <div data-testid="distro-select" />,
}));

describe("MonitoringPage", () => {
  it("renders monitoring title", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);

    expect(screen.getByText("Monitoring")).toBeInTheDocument();
  });

  it("shows 'no running' message when no distros are running", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [
        {
          name: "Ubuntu",
          state: "Stopped",
          wsl_version: 2,
          is_default: true,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);

    expect(screen.getByText("No running distributions")).toBeInTheDocument();
    expect(screen.queryByTestId("cpu-chart")).not.toBeInTheDocument();
  });

  it("renders charts when a running distro exists", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [
        {
          name: "Ubuntu",
          state: "Running",
          wsl_version: 2,
          is_default: true,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);

    expect(screen.getByTestId("cpu-chart")).toBeInTheDocument();
    expect(screen.getByTestId("memory-chart")).toBeInTheDocument();
    expect(screen.getByTestId("disk-gauge")).toBeInTheDocument();
    expect(screen.getByTestId("network-chart")).toBeInTheDocument();
  });

  it("renders distro selector", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);

    expect(screen.getByTestId("distro-select")).toBeInTheDocument();
  });

  it("renders time range picker", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);

    expect(screen.getByTestId("time-range-picker")).toBeInTheDocument();
  });

  it("renders refresh button", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);

    expect(screen.getByLabelText("Refresh monitoring data")).toBeInTheDocument();
  });

  it("renders process table when processes data available", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [
        {
          name: "Ubuntu",
          state: "Running",
          wsl_version: 2,
          is_default: true,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);
    vi.mocked(useProcesses).mockReturnValue({
      data: [
        {
          pid: 1,
          name: "test",
          cpu_percent: 1,
          memory_bytes: 1000,
          user: "root",
          command: "test",
        },
      ],
    } as unknown as ReturnType<typeof useProcesses>);

    renderWithProviders(<MonitoringPage />);

    expect(screen.getByTestId("process-table")).toBeInTheDocument();
  });
});
