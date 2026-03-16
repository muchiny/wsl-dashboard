import { useState, useCallback, useRef, useEffect } from "react";
import { useTauriEvent } from "@/shared/hooks/use-tauri-event";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { SystemMetrics } from "@/shared/types/monitoring";
import type { MetricsPoint } from "./use-metrics-history";

const MAX_POINTS = 60; // ~2 minutes of live data

interface PrevSample {
  rx: number;
  tx: number;
  diskRead: number;
  diskWrite: number;
}

/**
 * Converts a SystemMetrics object into a MetricsPoint for chart display.
 * Network and disk I/O rates are computed from the previous sample; 0 if no previous exists.
 */
function metricsToPoint(
  metrics: SystemMetrics,
  prev: PrevSample | null,
): { point: MetricsPoint; sample: PrevSample } {
  const totalRx = metrics.network.interfaces.reduce((sum, i) => sum + i.rx_bytes, 0);
  const totalTx = metrics.network.interfaces.reduce((sum, i) => sum + i.tx_bytes, 0);
  const diskRead = metrics.disk_io?.read_bytes_per_sec ?? 0;
  const diskWrite = metrics.disk_io?.write_bytes_per_sec ?? 0;

  let netRxRate = 0;
  let netTxRate = 0;
  let diskReadRate = 0;
  let diskWriteRate = 0;

  if (prev) {
    netRxRate = Math.max(0, (totalRx - prev.rx) / 2);
    netTxRate = Math.max(0, (totalTx - prev.tx) / 2);
    // Disk I/O: cumulative bytes, compute rate per 2s interval
    diskReadRate = Math.max(0, (diskRead - prev.diskRead) / 2);
    diskWriteRate = Math.max(0, (diskWrite - prev.diskWrite) / 2);
  }

  const memPercent =
    metrics.memory.total_bytes > 0
      ? (metrics.memory.used_bytes / metrics.memory.total_bytes) * 100
      : 0;

  const swapPercent =
    metrics.memory.swap_total_bytes > 0
      ? (metrics.memory.swap_used_bytes / metrics.memory.swap_total_bytes) * 100
      : 0;

  const gpuVramPercent =
    metrics.gpu?.vram_total_bytes && metrics.gpu.vram_used_bytes
      ? (metrics.gpu.vram_used_bytes / metrics.gpu.vram_total_bytes) * 100
      : undefined;

  return {
    point: {
      time: new Date(metrics.timestamp).toLocaleTimeString(),
      cpu: metrics.cpu.usage_percent,
      memUsed: metrics.memory.used_bytes,
      memTotal: metrics.memory.total_bytes,
      memPercent,
      diskPercent: metrics.disk.usage_percent,
      netRx: netRxRate,
      netTx: netTxRate,
      perCore: metrics.cpu.per_core,
      swapPercent,
      contextSwitches: metrics.context_switches,
      diskReadRate,
      diskWriteRate,
      tcpEstablished: metrics.tcp_connections?.established,
      tcpTimeWait: metrics.tcp_connections?.time_wait,
      tcpListen: metrics.tcp_connections?.listen,
      gpuPercent: metrics.gpu?.utilization_percent ?? undefined,
      gpuVramPercent,
    },
    sample: { rx: totalRx, tx: totalTx, diskRead, diskWrite },
  };
}

/**
 * Event-driven live metrics hook.
 * Subscribes to "system-metrics" Tauri events pushed by the background collector,
 * filters by distro name, and maintains a sliding window of MetricsPoint.
 *
 * On distro selection, fires a one-shot fetch to display data immediately
 * instead of waiting up to 2s for the next background collector tick.
 */
export function useLiveMetrics(distroName: string | null) {
  const [history, setHistory] = useState<MetricsPoint[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<SystemMetrics | null>(null);
  const [perCoreHistory, setPerCoreHistory] = useState<number[][]>([]);
  const prevSampleRef = useRef<PrevSample | null>(null);
  const [prevDistro, setPrevDistro] = useState(distroName);

  // Track distro changes to clear state (adjust-state-during-render pattern)
  if (prevDistro !== distroName) {
    setPrevDistro(distroName);
    setHistory([]);
    setLatestMetrics(null);
    setPerCoreHistory([]);
  }

  // Clear refs when distro changes (side effect) + bootstrap fetch
  useEffect(() => {
    prevSampleRef.current = null;

    // Bootstrap: fire a one-shot fetch for immediate data
    if (!distroName) return;
    let cancelled = false;

    tauriInvoke<SystemMetrics>("get_system_metrics", { distroName })
      .then((metrics) => {
        if (cancelled) return;
        setLatestMetrics((current) => current ?? metrics);
        setHistory((current) => {
          if (current.length > 0) return current; // event already arrived
          const { point, sample } = metricsToPoint(metrics, null);
          prevSampleRef.current = sample;
          return [point];
        });
        // Bootstrap per-core history
        if (metrics.cpu.per_core.length > 0) {
          setPerCoreHistory((current) => {
            if (current.length > 0) return current;
            return metrics.cpu.per_core.map((val) => [val]);
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [distroName]);

  const handler = useCallback(
    (metrics: SystemMetrics) => {
      // Filter: only process events for the selected distro
      if (!distroName || metrics.distro_name !== distroName) return;

      setLatestMetrics(metrics);

      const { point, sample } = metricsToPoint(metrics, prevSampleRef.current);
      prevSampleRef.current = sample;

      setHistory((prev) => [...prev, point].slice(-MAX_POINTS));

      // Update per-core history
      if (metrics.cpu.per_core.length > 0) {
        setPerCoreHistory((prev) => {
          return metrics.cpu.per_core.map((val, i) => {
            const prevHistory = prev[i] ?? [];
            return [...prevHistory, val].slice(-MAX_POINTS);
          });
        });
      }
    },
    [distroName],
  );

  useTauriEvent<SystemMetrics>("system-metrics", handler);

  return {
    history,
    latestMetrics,
    perCoreHistory,
  };
}
