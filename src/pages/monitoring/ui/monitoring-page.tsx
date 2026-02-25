import { useState, useEffect, useCallback, useMemo } from "react";
import { Activity, BarChart3 } from "lucide-react";
import { useSearch } from "@tanstack/react-router";
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
  const searchParams = useSearch({ strict: false }) as { distro?: string };
  const runningDistros = useMemo(
    () => distros?.filter((d) => d.state === "Running") ?? [],
    [distros],
  );

  const [selectedDistro, setSelectedDistro] = useState<string>("");
  const [initializedFromParam, setInitializedFromParam] = useState(false);
  const [history, setHistory] = useState<ReturnType<typeof useMetricsHistory>["history"]>([]);

  const { push, clear } = useMetricsHistory();

  // Pre-select distro from search param (one-time)
  useEffect(() => {
    if (initializedFromParam || !searchParams.distro || runningDistros.length === 0) return;
    const match = runningDistros.find((d) => d.name === searchParams.distro);
    if (match) {
      setSelectedDistro(match.name);
      clear();
      setHistory([]);
      setInitializedFromParam(true);
    }
  }, [searchParams.distro, runningDistros, initializedFromParam, clear]);

  // Reset when selected distro is no longer running, auto-select first available
  useEffect(() => {
    if (selectedDistro && !runningDistros.some((d) => d.name === selectedDistro)) {
      setSelectedDistro("");
      clear();
      setHistory([]);
    } else if (!selectedDistro && !initializedFromParam && runningDistros.length > 0) {
      const first = runningDistros[0];
      if (first) setSelectedDistro(first.name);
    }
  }, [runningDistros, selectedDistro, clear, initializedFromParam]);

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

  useEffect(() => {
    if (metrics) {
      const newHistory = push(metrics);
      setHistory(newHistory);
    }
  }, [metrics, push]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-sapphire/15 flex h-9 w-9 items-center justify-center rounded-lg">
            <Activity className="text-sapphire h-5 w-5" />
          </div>
          <div>
            <h2 className="text-text text-xl font-bold">Monitoring</h2>
            <p className="text-subtext-0 text-sm">Real-time system metrics</p>
          </div>
        </div>
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
