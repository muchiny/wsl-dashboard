import { useRef, useCallback } from "react";
import type { SystemMetrics } from "@/shared/types/monitoring";

const MAX_POINTS = 60; // 2 minutes at 2s intervals

export interface MetricsPoint {
  time: string;
  cpu: number;
  memUsed: number;
  memTotal: number;
  memPercent: number;
  diskPercent: number;
  netRx: number;
  netTx: number;
}

export function useMetricsHistory() {
  const historyRef = useRef<MetricsPoint[]>([]);
  const prevNetRef = useRef<{ rx: number; tx: number } | null>(null);

  const push = useCallback((metrics: SystemMetrics): MetricsPoint[] => {
    const totalRx = metrics.network.interfaces.reduce((sum, i) => sum + i.rx_bytes, 0);
    const totalTx = metrics.network.interfaces.reduce((sum, i) => sum + i.tx_bytes, 0);

    // Calculate network rate (bytes/sec, assuming ~2s interval)
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

    const next = [...historyRef.current, point].slice(-MAX_POINTS);
    historyRef.current = next;
    return next;
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    prevNetRef.current = null;
  }, []);

  return { history: historyRef.current, push, clear };
}
