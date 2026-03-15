import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DeleteDistroDialog } from "@/features/distro-list/ui/delete-distro-dialog";
import { CreateSnapshotDialog } from "@/features/snapshot-list/ui/create-snapshot-dialog";
import { RestoreSnapshotDialog } from "@/features/snapshot-list/ui/restore-snapshot-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useShutdownAll } from "@/features/distro-list/api/mutations";
import { toast } from "@/shared/ui/toast-store";

export function useDistroDialogs() {
  const { t } = useTranslation();
  const shutdownAll = useShutdownAll();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForDistro, setCreateForDistro] = useState("");
  const [restoreSnapshotId, setRestoreSnapshotId] = useState<string | null>(null);
  const [restoreDistroName, setRestoreDistroName] = useState("");
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openCreateSnapshot = (distroName: string = "") => {
    setCreateForDistro(distroName);
    setCreateOpen(true);
  };

  const openRestore = (snapshotId: string, distroName: string) => {
    setRestoreSnapshotId(snapshotId);
    setRestoreDistroName(distroName);
  };

  const openShutdownConfirm = () => setShowShutdownConfirm(true);
  const openDelete = (distroName: string) => setDeleteTarget(distroName);

  function DialogsRenderer({ running }: { running: number }) {
    return (
      <>
        <DeleteDistroDialog
          open={!!deleteTarget}
          distroName={deleteTarget ?? ""}
          onClose={() => setDeleteTarget(null)}
        />
        <CreateSnapshotDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultDistro={createForDistro}
        />
        <RestoreSnapshotDialog
          open={!!restoreSnapshotId}
          snapshotId={restoreSnapshotId}
          distroName={restoreDistroName}
          onClose={() => setRestoreSnapshotId(null)}
        />
        <ConfirmDialog
          open={showShutdownConfirm}
          title={t("distros.shutdownAllTitle")}
          description={t("distros.shutdownAllDescription", { count: running })}
          confirmLabel={t("distros.shutdownAllConfirm")}
          variant="danger"
          isPending={shutdownAll.isPending}
          onConfirm={() => {
            shutdownAll.mutate(undefined, {
              onSuccess: () => {
                toast.success(t("distros.shutdownSuccess"));
                setShowShutdownConfirm(false);
              },
              onError: (err) => {
                toast.error(t("distros.shutdownFailed", { message: err.message }));
              },
            });
          }}
          onCancel={() => setShowShutdownConfirm(false)}
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
