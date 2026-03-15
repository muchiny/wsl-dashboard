import { useQuery, useIsMutating } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { Distro } from "@/shared/types/distro";

export const distroKeys = {
  all: ["distros"] as const,
  list: () => [...distroKeys.all, "list"] as const,
};

export function useDistros() {
  const activeMutations = useIsMutating();
  return useQuery({
    queryKey: distroKeys.list(),
    queryFn: () => tauriInvoke<Distro[]>("list_distros"),
    refetchInterval: activeMutations > 0 ? 2_000 : 10_000,
  });
}
