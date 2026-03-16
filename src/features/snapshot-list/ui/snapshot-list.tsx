import { useTranslation } from "react-i18next";
import { useSnapshots } from "../api/queries";
import { useDeleteSnapshot } from "../api/mutations";
import { SnapshotCard } from "./snapshot-card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useDialogState } from "@/shared/hooks/use-dialog-state";
import { toast } from "@/shared/ui/toast-store";

interface SnapshotListProps {
  distroName?: string;
  onRestore: (snapshotId: string, distroName: string) => void;
  hideDistroName?: boolean;
}

export function SnapshotList({ distroName, onRestore, hideDistroName }: SnapshotListProps) {
  const { t } = useTranslation();
  const { data: snapshots, isLoading, error } = useSnapshots(distroName);
  const deleteSnapshot = useDeleteSnapshot();
  const deleteDialog = useDialogState<{ id: string; name: string }>();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card-lite h-32 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-red/30 bg-red/10 text-red rounded-xl border p-4">
        {t("snapshots.failedToLoad", { message: error.message })}
      </div>
    );
  }

  if (!snapshots?.length) {
    return (
      <div className="text-subtext-0 py-6 text-center text-sm">{t("snapshots.noSnapshots")}</div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {snapshots.map((snapshot) => (
          <SnapshotCard
            key={snapshot.id}
            snapshot={snapshot}
            onDelete={() => deleteDialog.open({ id: snapshot.id, name: snapshot.name })}
            onRestore={() => onRestore(snapshot.id, snapshot.distro_name)}
            hideDistroName={hideDistroName}
          />
        ))}
      </div>

      <ConfirmDialog
        open={deleteDialog.isOpen}
        title={t("snapshots.deleteTitle")}
        description={t("snapshots.deleteDescription", { name: deleteDialog.data?.name })}
        confirmLabel={t("common.delete")}
        variant="danger"
        isPending={deleteSnapshot.isPending}
        onConfirm={() => {
          if (!deleteDialog.data) return;
          deleteSnapshot.mutate(deleteDialog.data.id, {
            onSuccess: () => {
              toast.success(t("snapshots.deleteSuccess", { name: deleteDialog.data!.name }));
              deleteDialog.close();
            },
            onError: (err) => {
              toast.error(t("snapshots.deleteFailed", { message: err.message }));
            },
          });
        }}
        onCancel={deleteDialog.close}
      />
    </>
  );
}
