import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshots } from "../api/queries";
import { useDeleteSnapshot } from "../api/mutations";
import { SnapshotCard } from "./snapshot-card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-surface-1 bg-base h-32 animate-pulse rounded-xl border" />
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
            onDelete={() => setDeleteTarget({ id: snapshot.id, name: snapshot.name })}
            onRestore={() => onRestore(snapshot.id, snapshot.distro_name)}
            hideDistroName={hideDistroName}
          />
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("snapshots.deleteTitle")}
        description={t("snapshots.deleteDescription", { name: deleteTarget?.name })}
        confirmLabel={t("common.delete")}
        variant="danger"
        isPending={deleteSnapshot.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSnapshot.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(t("snapshots.deleteSuccess", { name: deleteTarget.name }));
              setDeleteTarget(null);
            },
            onError: (err) => {
              toast.error(t("snapshots.deleteFailed", { message: err.message }));
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
