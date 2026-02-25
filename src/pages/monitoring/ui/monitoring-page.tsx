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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="text-primary h-6 w-6" />
            <h2 className="text-2xl font-bold">Monitoring</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time system metrics for WSL distributions.
          </p>
        </div>
        <select
          value={selectedDistro}
          onChange={(e) => handleDistroChange(e.target.value)}
          className="border-border bg-background focus:border-primary rounded-md border px-3 py-2 text-sm focus:outline-none"
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
        <div className="border-border bg-card text-muted-foreground rounded-lg border p-8 text-center">
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
