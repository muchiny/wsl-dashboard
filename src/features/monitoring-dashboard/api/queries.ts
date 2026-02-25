import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { SystemMetrics } from "@/shared/types/monitoring";

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
};

export function useSystemMetrics(distroName: string | null, enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.metrics(distroName ?? ""),
    queryFn: () =>
      tauriInvoke<SystemMetrics>("get_system_metrics", {
        distroName: distroName!,
      }),
    enabled: !!distroName && enabled,
    refetchInterval: 2000,
  });
}

export function useProcesses(distroName: string | null, enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.processes(distroName ?? ""),
    queryFn: () =>
      tauriInvoke<ProcessInfo[]>("get_processes", {
        distroName: distroName!,
      }),
    enabled: !!distroName && enabled,
    refetchInterval: 3000,
  });
}
