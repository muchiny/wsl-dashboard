import { useState, useCallback, useRef } from "react";
import { useTauriEvent } from "@/shared/hooks/use-tauri-event";
import type { SystemMetrics } from "@/shared/types/monitoring";
import type { MetricsPoint } from "./use-metrics-history";

const MAX_POINTS = 60; // ~2 minutes of live data

/**
 * Event-driven live metrics hook.
 * Subscribes to "system-metrics" Tauri events pushed by the background collector,
 * filters by distro name, and maintains a sliding window of MetricsPoint.
 */
export function useLiveMetrics(distroName: string | null) {
  const [history, setHistory] = useState<MetricsPoint[]>([]);
  const prevNetRef = useRef<{ rx: number; tx: number } | null>(null);
  const distroRef = useRef(distroName);

  // Track distro changes to clear state
  if (distroRef.current !== distroName) {
    distroRef.current = distroName;
    prevNetRef.current = null;
    setHistory([]);
  }

  const latestMetricsRef = useRef<SystemMetrics | null>(null);

  const handler = useCallback(
    (metrics: SystemMetrics) => {
      // Filter: only process events for the selected distro
      if (!distroName || metrics.distro_name !== distroName) return;

      latestMetricsRef.current = metrics;

      const totalRx = metrics.network.interfaces.reduce(
        (sum, i) => sum + i.rx_bytes,
        0,
      );
      const totalTx = metrics.network.interfaces.reduce(
        (sum, i) => sum + i.tx_bytes,
        0,
      );

      let netRxRate = 0;
      let netTxRate = 0;
      if (prevNetRef.current) {
        netRxRate = Math.max(0, (totalRx - prevNetRef.current.rx) / 2);
        netTxRate = Math.max(0, (totalTx - prevNetRef.current.tx) / 2);
      }
      prevNetRef.current = { rx: totalRx, tx: totalTx };

      const memPercent =
        metrics.memory.total_bytes > 0
          ? (metrics.memory.used_bytes / metrics.memory.total_bytes) * 100
          : 0;

      const point: MetricsPoint = {
        time: new Date(metrics.timestamp).toLocaleTimeString(),
        cpu: metrics.cpu.usage_percent,
        memUsed: metrics.memory.used_bytes,
        memTotal: metrics.memory.total_bytes,
        memPercent,
        diskPercent: metrics.disk.usage_percent,
        netRx: netRxRate,
        netTx: netTxRate,
      };

      setHistory((prev) => [...prev, point].slice(-MAX_POINTS));
    },
    [distroName],
  );

  useTauriEvent<SystemMetrics>("system-metrics", handler);

  return {
    history,
    latestMetrics: latestMetricsRef.current,
  };
}
