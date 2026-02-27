import { useState, useCallback, useRef, useEffect } from "react";
import { useTauriEvent } from "@/shared/hooks/use-tauri-event";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { SystemMetrics } from "@/shared/types/monitoring";
import type { MetricsPoint } from "./use-metrics-history";

const MAX_POINTS = 60; // ~2 minutes of live data

/**
 * Converts a SystemMetrics object into a MetricsPoint for chart display.
 * Network rates are computed from the previous sample; 0 if no previous exists.
 */
function metricsToPoint(
  metrics: SystemMetrics,
  prevNet: { rx: number; tx: number } | null,
): { point: MetricsPoint; net: { rx: number; tx: number } } {
  const totalRx = metrics.network.interfaces.reduce((sum, i) => sum + i.rx_bytes, 0);
  const totalTx = metrics.network.interfaces.reduce((sum, i) => sum + i.tx_bytes, 0);

  let netRxRate = 0;
  let netTxRate = 0;
  if (prevNet) {
    netRxRate = Math.max(0, (totalRx - prevNet.rx) / 2);
    netTxRate = Math.max(0, (totalTx - prevNet.tx) / 2);
  }

  const memPercent =
    metrics.memory.total_bytes > 0
      ? (metrics.memory.used_bytes / metrics.memory.total_bytes) * 100
      : 0;

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
    },
    net: { rx: totalRx, tx: totalTx },
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
  const prevNetRef = useRef<{ rx: number; tx: number } | null>(null);
  const [prevDistro, setPrevDistro] = useState(distroName);

  // Track distro changes to clear state (adjust-state-during-render pattern)
  if (prevDistro !== distroName) {
    setPrevDistro(distroName);
    setHistory([]);
    setLatestMetrics(null);
  }

  // Clear refs when distro changes (side effect) + bootstrap fetch
  useEffect(() => {
    prevNetRef.current = null;

    // Bootstrap: fire a one-shot fetch for immediate data
    if (!distroName) return;
    let cancelled = false;

    tauriInvoke<SystemMetrics>("get_system_metrics", { distroName })
      .then((metrics) => {
        if (cancelled) return;
        setLatestMetrics((current) => current ?? metrics);
        setHistory((current) => {
          if (current.length > 0) return current; // event already arrived
          const { point, net } = metricsToPoint(metrics, null);
          prevNetRef.current = net;
          return [point];
        });
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

      const { point, net } = metricsToPoint(metrics, prevNetRef.current);
      prevNetRef.current = net;

      setHistory((prev) => [...prev, point].slice(-MAX_POINTS));
    },
    [distroName],
  );

  useTauriEvent<SystemMetrics>("system-metrics", handler);

  return {
    history,
    latestMetrics,
  };
}
