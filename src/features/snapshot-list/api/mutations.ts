import { tauriInvoke } from "@/shared/api/tauri-client";
import { useTauriMutation } from "@/shared/api/use-tauri-mutation";
import { snapshotKeys } from "./queries";
import { distroKeys } from "@/shared/api/distro-queries";
import type { Snapshot, CreateSnapshotArgs, RestoreSnapshotArgs } from "@/shared/types/snapshot";

export function useCreateSnapshot() {
  return useTauriMutation<Snapshot, CreateSnapshotArgs>({
    mutationFn: (args) => tauriInvoke<Snapshot>("create_snapshot", { args }),
    invalidateKeys: [snapshotKeys.all],
    successMessage: (_data, args) => `Snapshot "${args.name}" export started`,
    errorMessage: (err) => `Failed to create snapshot: ${err.message}`,
  });
}

export function useDeleteSnapshot() {
  return useTauriMutation<void, string>({
    mutationFn: (snapshotId) => tauriInvoke("delete_snapshot", { snapshotId }),
    invalidateKeys: [snapshotKeys.all],
  });
}

export function useRestoreSnapshot() {
  return useTauriMutation<void, RestoreSnapshotArgs>({
    mutationFn: (args) => tauriInvoke("restore_snapshot", { args }),
    invalidateKeys: [snapshotKeys.all, distroKeys.all],
    successMessage: "Snapshot restored successfully",
    errorMessage: (err) => `Restore failed: ${err.message}`,
  });
}
