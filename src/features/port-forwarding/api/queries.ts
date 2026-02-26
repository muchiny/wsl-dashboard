import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";

export interface ListeningPort {
  port: number;
  protocol: string;
  process: string;
  pid: number | null;
}

export interface PortForwardRule {
  id: string;
  distro_name: string;
  wsl_port: number;
  host_port: number;
  protocol: string;
  enabled: boolean;
  created_at: string;
}

export const portForwardingKeys = {
  all: ["port-forwarding"] as const,
  listeningPorts: (distro: string) => [...portForwardingKeys.all, "listening", distro] as const,
  rules: (distro?: string) => [...portForwardingKeys.all, "rules", distro ?? "all"] as const,
};

export function useListeningPorts(distroName: string) {
  return useQuery({
    queryKey: portForwardingKeys.listeningPorts(distroName),
    queryFn: () =>
      tauriInvoke<ListeningPort[]>("list_listening_ports", {
        distroName,
      }),
    enabled: !!distroName,
    refetchInterval: 10_000,
  });
}

export function usePortForwardingRules(distroName?: string) {
  return useQuery({
    queryKey: portForwardingKeys.rules(distroName),
    queryFn: () =>
      tauriInvoke<PortForwardRule[]>("get_port_forwarding_rules", {
        distroName: distroName ?? null,
      }),
    refetchInterval: 10_000,
  });
}
