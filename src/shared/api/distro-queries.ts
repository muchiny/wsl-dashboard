import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { Distro } from "@/shared/types/distro";

export const distroKeys = {
  all: ["distros"] as const,
  list: () => [...distroKeys.all, "list"] as const,
};

export function useDistros() {
  return useQuery({
    queryKey: distroKeys.list(),
    queryFn: () => tauriInvoke<Distro[]>("list_distros"),
    refetchInterval: 10_000,
  });
}
