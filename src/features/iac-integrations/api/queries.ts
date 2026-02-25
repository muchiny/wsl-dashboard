import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";

export interface IacToolset {
  ansible_version: string | null;
  kubectl_version: string | null;
  terraform_version: string | null;
  helm_version: string | null;
}

export interface KubernetesCluster {
  context: string;
  server: string;
  nodes: { name: string; status: string; roles: string[] }[];
  pod_count: number;
}

export const iacKeys = {
  all: ["iac"] as const,
  tools: (distro: string) => [...iacKeys.all, "tools", distro] as const,
  k8s: (distro: string) => [...iacKeys.all, "k8s", distro] as const,
};

export function useIacTools(distroName: string | null) {
  return useQuery({
    queryKey: iacKeys.tools(distroName ?? ""),
    queryFn: () =>
      tauriInvoke<IacToolset>("detect_iac_tools", {
        distroName: distroName!,
      }),
    enabled: !!distroName,
  });
}

export function useK8sInfo(distroName: string | null, enabled = true) {
  return useQuery({
    queryKey: iacKeys.k8s(distroName ?? ""),
    queryFn: () =>
      tauriInvoke<KubernetesCluster>("get_k8s_info", {
        distroName: distroName!,
      }),
    enabled: !!distroName && enabled,
  });
}
