import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { useDistros } from "@/shared/api/distro-queries";
import { useProcesses, useMetricsHistory } from "@/features/monitoring-dashboard/api/queries";
import { MonitoringPage } from "./monitoring-page";

vi.mock("@/shared/api/distro-queries", () => ({ useDistros: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useSearch: vi.fn(() => ({})),
}));
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
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
  useLiveMetrics: vi.fn(() => ({ history: [], latestMetrics: null, perCoreHistory: [] })),
}));
vi.mock("@/features/monitoring-dashboard/ui/alert-badge", () => ({
  AlertBadge: () => null,
}));
vi.mock("@/features/monitoring-dashboard/ui/kpi-banner", () => ({
  KpiBanner: () => <div data-testid="kpi-banner" />,
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
vi.mock("@/features/monitoring-dashboard/ui/disk-io-chart", () => ({
  DiskIoChart: () => <div data-testid="disk-io-chart" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/process-table", () => ({
  ProcessTable: () => <div data-testid="process-table" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/per-core-chart", () => ({
  PerCoreChart: () => <div data-testid="per-core-chart" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/gpu-panel", () => ({
  GpuPanel: () => <div data-testid="gpu-panel" />,
}));
vi.mock("@/features/monitoring-dashboard/ui/time-range-picker", () => ({
  TimeRangePicker: ({ onChange, value }: { onChange: (v: string) => void; value: string }) => (
    <select
      data-testid="time-range-picker"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="live">Live</option>
      <option value="1h">1h</option>
    </select>
  ),
}));
vi.mock("@/shared/ui/select", () => ({
  Select: ({
    onChange,
    value,
    ...props
  }: {
    onChange: (v: string) => void;
    value: string;
    "aria-label"?: string;
  }) => (
    <select
      data-testid="distro-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={props["aria-label"]}
    >
      <option value="">Select...</option>
      <option value="Ubuntu">Ubuntu</option>
      <option value="Debian">Debian</option>
    </select>
  ),
}));

const runningUbuntu = {
  name: "Ubuntu",
  state: "Running",
  wsl_version: 2,
  is_default: true,
  base_path: null,
  vhdx_size_bytes: null,
  last_seen: "",
};

describe("MonitoringPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("shows live subtitle by default", () => {
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
    expect(screen.getByText("Real-time system metrics")).toBeInTheDocument();
  });

  it("does not show process table when no process data", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);
    vi.mocked(useProcesses).mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useProcesses>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.queryByTestId("process-table")).not.toBeInTheDocument();
  });

  it("selects distro from URL search params", async () => {
    const { useSearch } = await import("@tanstack/react-router");
    vi.mocked(useSearch).mockReturnValue({ distro: "Ubuntu" });
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.getByTestId("cpu-chart")).toBeInTheDocument();
    // Reset mock
    vi.mocked(useSearch).mockReturnValue({});
  });

  it("refresh button invalidates queries", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    fireEvent.click(screen.getByLabelText("Refresh monitoring data"));
    expect(mockInvalidateQueries).toHaveBeenCalledOnce();
  });

  it("handleDistroChange selects a distro and shows charts", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu, { ...runningUbuntu, name: "Debian" }],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    fireEvent.change(screen.getByTestId("distro-select"), { target: { value: "Debian" } });
    expect(screen.getByTestId("cpu-chart")).toBeInTheDocument();
  });

  it("switches to historical time range and shows history subtitle", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);
    vi.mocked(useMetricsHistory).mockReturnValue({
      data: {
        points: [
          {
            timestamp: "2025-01-01T00:00:00Z",
            cpu_avg: 50,
            mem_used_bytes: 1000,
            mem_total_bytes: 2000,
            disk_usage_percent: 40,
            net_rx_rate: 100,
            net_tx_rate: 200,
          },
        ],
      },
    } as unknown as ReturnType<typeof useMetricsHistory>);

    renderWithProviders(<MonitoringPage />);
    fireEvent.change(screen.getByTestId("time-range-picker"), { target: { value: "1h" } });
    expect(screen.getByText("Last 1h history")).toBeInTheDocument();
  });

  // ── New UX structure tests ──

  it("renders KPI banner when a distro is selected", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.getByTestId("kpi-banner")).toBeInTheDocument();
  });

  it("does not render KPI banner when no distro selected", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.queryByTestId("kpi-banner")).not.toBeInTheDocument();
  });

  it("renders section headers when distro is selected", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Storage")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("does not render section headers when no distro selected", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.queryByText("Storage")).not.toBeInTheDocument();
  });

  it("renders disk I/O chart in storage section", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.getByTestId("disk-io-chart")).toBeInTheDocument();
  });

  it("renders Processes section header when processes available", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);
    vi.mocked(useProcesses).mockReturnValue({
      data: [
        { pid: 1, name: "test", cpu_percent: 1, memory_bytes: 1000, user: "root", command: "test" },
      ],
    } as unknown as ReturnType<typeof useProcesses>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.getByText("Processes")).toBeInTheDocument();
  });

  it("does not render Processes section header when no processes", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);
    vi.mocked(useProcesses).mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useProcesses>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.queryByText("Processes")).not.toBeInTheDocument();
  });

  it("does not show process table when processes is empty array", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [runningUbuntu],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDistros>);
    vi.mocked(useProcesses).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useProcesses>);

    renderWithProviders(<MonitoringPage />);
    expect(screen.queryByTestId("process-table")).not.toBeInTheDocument();
  });
});
