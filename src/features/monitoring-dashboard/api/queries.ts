import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import type { TimeRange, MetricsHistoryResponse, AlertThreshold } from "@/shared/types/monitoring";

export interface ProcessInfo {
  pid: number;
  user: string;
  cpu_percent: number;
  mem_percent: number;
  vsz_bytes: number;
  rss_bytes: number;
  command: string;
  state: string;
}

export const monitoringKeys = {
  all: ["monitoring"] as const,
  metrics: (distro: string) => [...monitoringKeys.all, "metrics", distro] as const,
  processes: (distro: string) => [...monitoringKeys.all, "processes", distro] as const,
  history: (distro: string, range: string) =>
    [...monitoringKeys.all, "history", distro, range] as const,
  alertThresholds: [...["monitoring"], "alertThresholds"] as const,
  alerts: (distro: string) => [...["monitoring"], "alerts", distro] as const,
};

export function useProcesses(distroName: string | null, enabled = true) {
  const processesInterval = usePreferencesStore((s) => s.processesInterval);
  return useQuery({
    queryKey: monitoringKeys.processes(distroName ?? ""),
    queryFn: () =>
      tauriInvoke<ProcessInfo[]>("get_processes", {
        distroName: distroName!,
      }),
    enabled: !!distroName && enabled,
    refetchInterval: processesInterval,
  });
}

// --- Historical metrics ---

function getTimeRangeMs(range: TimeRange): number {
  switch (range) {
    case "1h":
      return 60 * 60 * 1000;
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

export function useMetricsHistory(distroName: string | null, timeRange: TimeRange) {
  return useQuery({
    queryKey: monitoringKeys.history(distroName ?? "", timeRange),
    queryFn: () => {
      const now = new Date();
      const from = new Date(now.getTime() - getTimeRangeMs(timeRange));
      return tauriInvoke<MetricsHistoryResponse>("get_metrics_history", {
        distroName: distroName!,
        from: from.toISOString(),
        to: now.toISOString(),
      });
    },
    enabled: !!distroName && timeRange !== "live",
    refetchInterval: timeRange === "1h" ? 30_000 : 60_000,
  });
}

// --- Alert thresholds ---

export function useAlertThresholds() {
  return useQuery({
    queryKey: monitoringKeys.alertThresholds,
    queryFn: () => tauriInvoke<AlertThreshold[]>("get_alert_thresholds", {}),
  });
}

export function useSetAlertThresholds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (thresholds: AlertThreshold[]) =>
      tauriInvoke("set_alert_thresholds", { thresholds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: monitoringKeys.alertThresholds,
      });
    },
  });
}
