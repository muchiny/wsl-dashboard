import { useShutdownAll } from "@/features/distro-list/api/mutations";
import { useDialogState } from "@/shared/hooks/use-dialog-state";

export function useDistroDialogs() {
  const shutdownAll = useShutdownAll();

  const createSnapshot = useDialogState<string>();
  const restore = useDialogState<{ snapshotId: string; distroName: string }>();
  const shutdownConfirm = useDialogState();
  const deleteDistro = useDialogState<string>();

  const openCreateSnapshot = (distroName: string = "") => {
    createSnapshot.open(distroName);
  };

  const openRestore = (snapshotId: string, distroName: string) => {
    restore.open({ snapshotId, distroName });
  };

  const openShutdownConfirm = () => shutdownConfirm.open();
  const openDelete = (distroName: string) => deleteDistro.open(distroName);

  return {
    openCreateSnapshot,
    openRestore,
    openShutdownConfirm,
    openDelete,
    shutdownAllPending: shutdownAll.isPending,
    dialogs: { createSnapshot, restore, shutdownConfirm, deleteDistro, shutdownAll },
  };
}

/** The bundle of dialog state controllers produced by {@link useDistroDialogs}. */
export type DistroDialogsState = ReturnType<typeof useDistroDialogs>["dialogs"];
