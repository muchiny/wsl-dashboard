import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Activity, BarChart3, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select } from "@/shared/ui/select";
import { useSearch } from "@tanstack/react-router";
import { useDistros } from "@/shared/api/distro-queries";
import {
  useProcesses,
  useMetricsHistory as useMetricsHistoryQuery,
  monitoringKeys,
} from "@/features/monitoring-dashboard/api/queries";
import { useLiveMetrics } from "@/features/monitoring-dashboard/hooks/use-live-metrics";
import { AlertBadge } from "@/features/monitoring-dashboard/ui/alert-badge";
import { KpiBanner } from "@/features/monitoring-dashboard/ui/kpi-banner";
import { CpuChart } from "@/features/monitoring-dashboard/ui/cpu-chart";
import { MemoryChart } from "@/features/monitoring-dashboard/ui/memory-chart";
import { NetworkChart } from "@/features/monitoring-dashboard/ui/network-chart";
import { DiskGauge } from "@/features/monitoring-dashboard/ui/disk-gauge";
import { DiskIoChart } from "@/features/monitoring-dashboard/ui/disk-io-chart";
import { ProcessTable } from "@/features/monitoring-dashboard/ui/process-table";
import { TimeRangePicker } from "@/features/monitoring-dashboard/ui/time-range-picker";
import { PerCoreChart } from "@/features/monitoring-dashboard/ui/per-core-chart";
import { GpuPanel } from "@/features/monitoring-dashboard/ui/gpu-panel";
import type { TimeRange, MetricsHistoryPoint } from "@/shared/types/monitoring";
import type { MetricsPoint } from "@/features/monitoring-dashboard/hooks/use-metrics-history";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-subtext-0 border-surface-0 border-b pb-1 text-xs font-semibold tracking-wider uppercase">
      {children}
    </h3>
  );
}

export function MonitoringPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: distros } = useDistros();
  const searchParams = useSearch({ strict: false }) as { distro?: string };
  const runningDistros = useMemo(
    () => distros?.filter((d) => d.state === "Running") ?? [],
    [distros],
  );

  const [manualSelection, setManualSelection] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("live");

  const selectedDistro = useMemo(() => {
    if (manualSelection !== null && runningDistros.some((d) => d.name === manualSelection)) {
      return manualSelection;
    }
    if (searchParams.distro) {
      const match = runningDistros.find((d) => d.name === searchParams.distro);
      if (match) return match.name;
    }
    return runningDistros[0]?.name ?? "";
  }, [manualSelection, runningDistros, searchParams.distro]);

  const handleDistroChange = useCallback((name: string) => {
    setManualSelection(name);
    setTimeRange("live");
  }, []);

  const {
    history: liveHistory,
    latestMetrics,
    perCoreHistory,
  } = useLiveMetrics(timeRange === "live" ? selectedDistro || null : null);

  const { data: historyData } = useMetricsHistoryQuery(selectedDistro || null, timeRange);
  const { data: processes } = useProcesses(selectedDistro || null);

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
      swapPercent:
        p.swap_total_bytes && p.swap_total_bytes > 0
          ? ((p.swap_used_bytes ?? 0) / p.swap_total_bytes) * 100
          : 0,
      contextSwitches: p.context_switches,
      diskReadRate: p.disk_io_read_bytes,
      diskWriteRate: p.disk_io_write_bytes,
      tcpEstablished: p.tcp_established,
      tcpTimeWait: p.tcp_time_wait,
      tcpListen: p.tcp_listen,
      gpuPercent: p.gpu_utilization ?? undefined,
      gpuVramPercent:
        p.gpu_vram_total && p.gpu_vram_used
          ? (p.gpu_vram_used / p.gpu_vram_total) * 100
          : undefined,
    }));
  }, [timeRange, historyData]);

  const chartData = timeRange === "live" ? liveHistory : historicalChartData;

  return (
    <div className="h-full min-w-0 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-sapphire/25 relative flex h-9 w-9 items-center justify-center rounded-lg">
            <Activity className="text-sapphire h-5 w-5" />
            <AlertBadge />
          </div>
          <div>
            <h2 className="text-text text-xl font-bold">{t("monitoring.title")}</h2>
            <p className="text-subtext-0 text-sm">
              {timeRange === "live"
                ? t("monitoring.subtitleLive")
                : t("monitoring.subtitleHistory", { range: timeRange })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: monitoringKeys.all })}
            className="text-subtext-0 hover:text-text focus-ring rounded-lg p-2 transition-colors hover:bg-white/8"
            aria-label={t("monitoring.refreshData")}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Select
            value={selectedDistro}
            onChange={handleDistroChange}
            options={runningDistros.map((d) => ({ value: d.name, label: d.name }))}
            placeholder={t("monitoring.selectDistroPlaceholder")}
            aria-label={t("monitoring.selectDistroAriaLabel")}
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {/* Empty state */}
      {!selectedDistro && (
        <div className="glass-card flex flex-col items-center rounded-xl px-8 py-12 text-center">
          <BarChart3 className="text-surface-2 mb-3 h-10 w-10" />
          <p className="text-text font-medium">
            {runningDistros.length === 0 ? t("monitoring.noRunning") : t("monitoring.selectDistro")}
          </p>
          <p className="text-subtext-0 mt-1 text-sm">
            {runningDistros.length === 0
              ? t("monitoring.noRunningHint")
              : t("monitoring.selectDistroHint")}
          </p>
        </div>
      )}

      {selectedDistro && (
        <>
          {/* KPI Overview Banner */}
          <KpiBanner data={chartData} latestMetrics={latestMetrics} />

          {/* Section: CPU */}
          <section className="space-y-3">
            <SectionHeader>{t("monitoring.sectionCpu")}</SectionHeader>
            <CpuChart
              data={chartData}
              loadAverage={
                timeRange === "live"
                  ? (latestMetrics?.cpu.load_average as [number, number, number])
                  : undefined
              }
            />
            {timeRange === "live" && perCoreHistory.length > 0 && (
              <PerCoreChart
                perCoreHistory={perCoreHistory}
                currentValues={latestMetrics?.cpu.per_core ?? []}
              />
            )}
          </section>

          {/* Section: Memory */}
          <section className="space-y-3">
            <SectionHeader>{t("monitoring.sectionMemory")}</SectionHeader>
            <MemoryChart data={chartData} showSwap />
          </section>

          {/* Section: Processes (moved up!) */}
          {processes && processes.length > 0 && (
            <section className="space-y-3">
              <SectionHeader>{t("monitoring.sectionProcesses")}</SectionHeader>
              <ProcessTable processes={processes} />
            </section>
          )}

          {/* Section: Storage */}
          <section className="space-y-3">
            <SectionHeader>{t("monitoring.sectionStorage")}</SectionHeader>
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
              <DiskGauge
                disk={timeRange === "live" ? (latestMetrics?.disk ?? null) : null}
                historicalData={timeRange !== "live" ? chartData : undefined}
              />
              <DiskIoChart data={chartData} />
            </div>
          </section>

          {/* Section: Network */}
          <section className="space-y-3">
            <SectionHeader>{t("monitoring.sectionNetwork")}</SectionHeader>
            <NetworkChart data={chartData} showTcp />
          </section>

          {/* Section: GPU (conditional) */}
          {latestMetrics?.gpu && (
            <section className="space-y-3">
              <SectionHeader>{t("monitoring.sectionGpu")}</SectionHeader>
              <GpuPanel gpu={latestMetrics.gpu} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
