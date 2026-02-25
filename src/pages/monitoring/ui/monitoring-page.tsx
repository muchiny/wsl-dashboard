import { useState, useEffect, useCallback, useMemo } from "react";
import { Activity } from "lucide-react";
import { useDistros } from "@/features/distro-list/api/queries";
import { useSystemMetrics, useProcesses } from "@/features/monitoring-dashboard/api/queries";
import { useMetricsHistory } from "@/features/monitoring-dashboard/hooks/use-metrics-history";
import { CpuChart } from "@/features/monitoring-dashboard/ui/cpu-chart";
import { MemoryChart } from "@/features/monitoring-dashboard/ui/memory-chart";
import { NetworkChart } from "@/features/monitoring-dashboard/ui/network-chart";
import { DiskGauge } from "@/features/monitoring-dashboard/ui/disk-gauge";
import { ProcessTable } from "@/features/monitoring-dashboard/ui/process-table";

export function MonitoringPage() {
  const { data: distros } = useDistros();
  const runningDistros = useMemo(
    () => distros?.filter((d) => d.state === "Running") ?? [],
    [distros],
  );

  const [selectedDistro, setSelectedDistro] = useState<string>("");
  const [history, setHistory] = useState<ReturnType<typeof useMetricsHistory>["history"]>([]);

  const { push, clear } = useMetricsHistory();

  // Auto-select first running distro
  useEffect(() => {
    if (!selectedDistro && runningDistros.length > 0) {
      const first = runningDistros[0];
      if (first) setSelectedDistro(first.name);
    }
  }, [runningDistros, selectedDistro]);

  // Clear history when distro changes
  const handleDistroChange = useCallback(
    (name: string) => {
      setSelectedDistro(name);
      clear();
      setHistory([]);
    },
    [clear],
  );

  const { data: metrics } = useSystemMetrics(selectedDistro || null);
  const { data: processes } = useProcesses(selectedDistro || null);

  // Accumulate metrics into history
  useEffect(() => {
    if (metrics) {
      const newHistory = push(metrics);
      setHistory(newHistory);
    }
  }, [metrics, push]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sapphire/15">
            <Activity className="h-5 w-5 text-sapphire" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">Monitoring</h2>
            <p className="text-sm text-subtext-0">Real-time system metrics</p>
          </div>
        </div>
        <select
          value={selectedDistro}
          onChange={(e) => handleDistroChange(e.target.value)}
          className="rounded-lg border border-surface-1 bg-mantle px-4 py-2 text-sm text-text focus:border-blue focus:outline-none"
        >
          <option value="">Select a distro...</option>
          {runningDistros.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedDistro && (
        <div className="rounded-xl border border-surface-1 bg-mantle p-8 text-center text-subtext-0">
          {runningDistros.length === 0
            ? "No running distributions. Start a distro to view metrics."
            : "Select a distribution to start monitoring."}
        </div>
      )}

      {selectedDistro && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CpuChart
              data={history}
              loadAverage={metrics?.cpu.load_average as [number, number, number]}
            />
            <MemoryChart data={history} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DiskGauge disk={metrics?.disk ?? null} />
            <NetworkChart data={history} />
          </div>

          {processes && <ProcessTable processes={processes} />}
        </>
      )}
    </div>
  );
}
