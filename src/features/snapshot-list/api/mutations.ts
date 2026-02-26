import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { toast } from "@/shared/ui/toast";
import { snapshotKeys } from "./queries";
import type { Snapshot, CreateSnapshotArgs, RestoreSnapshotArgs } from "@/shared/types/snapshot";

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: CreateSnapshotArgs) => tauriInvoke<Snapshot>("create_snapshot", { args }),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
      toast.success(`Snapshot "${args.name}" export started`);
    },
    onError: (err) => {
      toast.error(`Failed to create snapshot: ${err.message}`);
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
      toast.success("Snapshot restored successfully");
    },
    onError: (err) => {
      toast.error(`Restore failed: ${err.message}`);
    },
  });
}
