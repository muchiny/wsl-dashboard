import { useTranslation } from "react-i18next";
import { DeleteDistroDialog } from "@/features/distro-list/ui/delete-distro-dialog";
import { CreateSnapshotDialog } from "@/features/snapshot-list/ui/create-snapshot-dialog";
import { RestoreSnapshotDialog } from "@/features/snapshot-list/ui/restore-snapshot-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useShutdownAll } from "@/features/distro-list/api/mutations";
import { useDialogState } from "@/shared/hooks/use-dialog-state";
import { toast } from "@/shared/ui/toast-store";

export function useDistroDialogs() {
  const { t } = useTranslation();
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

  function DialogsRenderer({ running }: { running: number }) {
    return (
      <>
        <DeleteDistroDialog
          open={deleteDistro.isOpen}
          distroName={deleteDistro.data ?? ""}
          onClose={deleteDistro.close}
        />
        <CreateSnapshotDialog
          open={createSnapshot.isOpen}
          onClose={createSnapshot.close}
          defaultDistro={createSnapshot.data ?? ""}
        />
        <RestoreSnapshotDialog
          open={restore.isOpen}
          snapshotId={restore.data?.snapshotId ?? null}
          distroName={restore.data?.distroName ?? ""}
          onClose={restore.close}
        />
        <ConfirmDialog
          open={shutdownConfirm.isOpen}
          title={t("distros.shutdownAllTitle")}
          description={t("distros.shutdownAllDescription", { count: running })}
          confirmLabel={t("distros.shutdownAllConfirm")}
          variant="danger"
          isPending={shutdownAll.isPending}
          onConfirm={() => {
            shutdownAll.mutate(undefined, {
              onSuccess: () => {
                toast.success(t("distros.shutdownSuccess"));
                shutdownConfirm.close();
              },
              onError: (err) => {
                toast.error(t("distros.shutdownFailed", { message: err.message }));
              },
            });
          }}
          onCancel={shutdownConfirm.close}
        />
      </>
    );
  }

  return {
    openCreateSnapshot,
    openRestore,
    openShutdownConfirm,
    openDelete,
    shutdownAllPending: shutdownAll.isPending,
    DialogsRenderer,
  };
}
