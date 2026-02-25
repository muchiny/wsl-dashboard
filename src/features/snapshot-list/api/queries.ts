import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { Snapshot } from "@/shared/types/snapshot";

export const snapshotKeys = {
  all: ["snapshots"] as const,
  list: (distroName?: string) => [...snapshotKeys.all, "list", distroName ?? "all"] as const,
};

export function useSnapshots(distroName?: string) {
  return useQuery({
    queryKey: snapshotKeys.list(distroName),
    queryFn: () =>
      tauriInvoke<Snapshot[]>("list_snapshots", {
        distroName: distroName ?? null,
      }),
  });
}
