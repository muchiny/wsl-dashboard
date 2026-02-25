import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { snapshotKeys } from "./queries";
import type { Snapshot, CreateSnapshotArgs, RestoreSnapshotArgs } from "@/shared/types/snapshot";

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: CreateSnapshotArgs) => tauriInvoke<Snapshot>("create_snapshot", { args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) => tauriInvoke("delete_snapshot", { snapshotId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
  });
}

export function useRestoreSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: RestoreSnapshotArgs) => tauriInvoke("restore_snapshot", { args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
  });
}
