import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { Distro, DistroDetail } from "@/shared/types/distro";

export const distroKeys = {
  all: ["distros"] as const,
  list: () => [...distroKeys.all, "list"] as const,
  detail: (name: string) => [...distroKeys.all, "detail", name] as const,
};

export function useDistros() {
  return useQuery({
    queryKey: distroKeys.list(),
    queryFn: () => tauriInvoke<Distro[]>("list_distros"),
    refetchInterval: 10_000,
  });
}

export function useDistroDetails(name: string | null) {
  return useQuery({
    queryKey: distroKeys.detail(name ?? ""),
    queryFn: () => tauriInvoke<DistroDetail>("get_distro_details", { name }),
    enabled: !!name,
  });
}
