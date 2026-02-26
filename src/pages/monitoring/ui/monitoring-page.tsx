import { useState, useEffect, useCallback, useMemo } from "react";
import { Activity, BarChart3 } from "lucide-react";
import { useSearch } from "@tanstack/react-router";
import { useDistros } from "@/features/distro-list/api/queries";
import {
  useProcesses,
  useMetricsHistory as useMetricsHistoryQuery,
} from "@/features/monitoring-dashboard/api/queries";
import { useLiveMetrics } from "@/features/monitoring-dashboard/hooks/use-live-metrics";
import { AlertBadge } from "@/features/monitoring-dashboard/ui/alert-badge";
import { CpuChart } from "@/features/monitoring-dashboard/ui/cpu-chart";
import { MemoryChart } from "@/features/monitoring-dashboard/ui/memory-chart";
import { NetworkChart } from "@/features/monitoring-dashboard/ui/network-chart";
import { DiskGauge } from "@/features/monitoring-dashboard/ui/disk-gauge";
import { ProcessTable } from "@/features/monitoring-dashboard/ui/process-table";
import { TimeRangePicker } from "@/features/monitoring-dashboard/ui/time-range-picker";
import type { TimeRange, MetricsHistoryPoint } from "@/shared/types/monitoring";
import type { MetricsPoint } from "@/features/monitoring-dashboard/hooks/use-metrics-history";

export function MonitoringPage() {
  const { data: distros } = useDistros();
  const searchParams = useSearch({ strict: false }) as { distro?: string };
  const runningDistros = useMemo(
    () => distros?.filter((d) => d.state === "Running") ?? [],
    [distros],
  );

  const [selectedDistro, setSelectedDistro] = useState<string>("");
  const [initializedFromParam, setInitializedFromParam] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("live");

  // Pre-select distro from search param (one-time)
  useEffect(() => {
    if (initializedFromParam || !searchParams.distro || runningDistros.length === 0) return;
    const match = runningDistros.find((d) => d.name === searchParams.distro);
    if (match) {
      setSelectedDistro(match.name);
      setInitializedFromParam(true);
    }
  }, [searchParams.distro, runningDistros, initializedFromParam]);

  // Reset when selected distro is no longer running, auto-select first available
  useEffect(() => {
    if (selectedDistro && !runningDistros.some((d) => d.name === selectedDistro)) {
      setSelectedDistro("");
    } else if (!selectedDistro && !initializedFromParam && runningDistros.length > 0) {
      const first = runningDistros[0];
      if (first) setSelectedDistro(first.name);
    }
  }, [runningDistros, selectedDistro, initializedFromParam]);

  const handleDistroChange = useCallback((name: string) => {
    setSelectedDistro(name);
    setTimeRange("live");
  }, []);

  // Live metrics via Tauri events (push-based)
  const { history: liveHistory, latestMetrics } = useLiveMetrics(
    timeRange === "live" ? selectedDistro || null : null,
  );

  // Historical metrics via TanStack Query
  const { data: historyData } = useMetricsHistoryQuery(selectedDistro || null, timeRange);

  // Processes (always polling-based)
  const { data: processes } = useProcesses(selectedDistro || null);

  // Transform historical data into chart-compatible format
  const historicalChartData: MetricsPoint[] = useMemo(() => {
    if (timeRange === "live" || !historyData?.points) return [];
    return historyData.points.map((p: MetricsHistoryPoint) => ({
      time: new Date(p.timestamp).toLocaleTimeString(),
      cpu: p.cpu_avg,
      memUsed: p.mem_used_bytes,
      memTotal: p.mem_total_bytes,
      memPercent: p.mem_total_bytes > 0 ? (p.mem_used_bytes / p.mem_total_bytes) * 100 : 0,
      diskPercent: p.disk_usage_percent,
      netRx: p.net_rx_rate,
      netTx: p.net_tx_rate,
    }));
  }, [timeRange, historyData]);

  const chartData = timeRange === "live" ? liveHistory : historicalChartData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-sapphire/15 relative flex h-9 w-9 items-center justify-center rounded-lg">
            <Activity className="text-sapphire h-5 w-5" />
            <AlertBadge />
          </div>
          <div>
            <h2 className="text-text text-xl font-bold">Monitoring</h2>
            <p className="text-subtext-0 text-sm">
              {timeRange === "live" ? "Real-time system metrics" : `Last ${timeRange} history`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          <select
            value={selectedDistro}
            onChange={(e) => handleDistroChange(e.target.value)}
            aria-label="Select distribution to monitor"
            className="border-surface-1 bg-mantle text-text focus:border-blue w-full rounded-lg border px-4 py-2 text-sm focus:outline-none sm:w-auto"
          >
            <option value="">Select a distro...</option>
            {runningDistros.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedDistro && (
        <div className="border-surface-1 bg-mantle flex flex-col items-center rounded-xl border px-8 py-12 text-center">
          <BarChart3 className="text-surface-2 mb-3 h-10 w-10" />
          <p className="text-text font-medium">
            {runningDistros.length === 0 ? "No running distributions" : "Select a distribution"}
          </p>
          <p className="text-subtext-0 mt-1 text-sm">
            {runningDistros.length === 0
              ? "Start a distro from the Distributions tab to view real-time metrics."
              : "Choose a running distribution from the dropdown above to start monitoring."}
          </p>
        </div>
      )}

      {selectedDistro && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CpuChart
              data={chartData}
              loadAverage={
                timeRange === "live"
                  ? (latestMetrics?.cpu.load_average as [number, number, number])
                  : undefined
              }
            />
            <MemoryChart data={chartData} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DiskGauge
              disk={timeRange === "live" ? (latestMetrics?.disk ?? null) : null}
              historicalData={timeRange !== "live" ? chartData : undefined}
            />
            <NetworkChart data={chartData} />
          </div>

          {processes && <ProcessTable processes={processes} />}
        </>
      )}
    </div>
  );
}
