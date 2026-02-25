import { useMemo } from "react";
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

export function useSnapshotCounts(): Record<string, number> {
  const { data: snapshots } = useSnapshots();
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const snap of snapshots ?? []) {
      counts[snap.distro_name] = (counts[snap.distro_name] ?? 0) + 1;
    }
    return counts;
  }, [snapshots]);
}
