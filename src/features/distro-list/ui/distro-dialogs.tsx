import { useTranslation } from "react-i18next";
import { DeleteDistroDialog } from "@/features/distro-list/ui/delete-distro-dialog";
import { CreateSnapshotDialog } from "@/features/snapshot-list/ui/create-snapshot-dialog";
import { RestoreSnapshotDialog } from "@/features/snapshot-list/ui/restore-snapshot-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/ui/toast-store";
import type { DistroDialogsState } from "@/features/distro-list/hooks/use-distro-dialogs";

/**
 * Renders all distro-related dialogs. Defined at module scope (NOT inside
 * `useDistroDialogs`) so its component identity stays stable across renders.
 *
 * A component declared inside the hook would get a fresh identity on every
 * render, so React would unmount + remount the entire dialog subtree whenever
 * the parent re-rendered. That reset the CreateSnapshot form (e.g. the output
 * directory) on every re-render and made the UI appear to refresh continuously
 * while the distro list polls every 2s during a pending operation.
 */
export function DistroDialogs({
  running,
  dialogs,
}: {
  running: number;
  dialogs: DistroDialogsState;
}) {
  const { t } = useTranslation();
  const { createSnapshot, restore, shutdownConfirm, deleteDistro, shutdownAll } = dialogs;

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
