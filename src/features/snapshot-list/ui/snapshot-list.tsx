import { useState } from "react";
import { useSnapshots } from "../api/queries";
import { useDeleteSnapshot } from "../api/mutations";
import { SnapshotCard } from "./snapshot-card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/ui/toast";

interface SnapshotListProps {
  distroName?: string;
  onRestore: (snapshotId: string, distroName: string) => void;
  hideDistroName?: boolean;
}

export function SnapshotList({ distroName, onRestore, hideDistroName }: SnapshotListProps) {
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
        Failed to load snapshots: {error.message}
      </div>
    );
  }

  if (!snapshots?.length) {
    return (
      <div className="text-subtext-0 py-6 text-center text-sm">
        No snapshots yet. Use the Snapshot button on a distribution to create one.
      </div>
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
        title="Delete snapshot"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isPending={deleteSnapshot.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSnapshot.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(`Snapshot "${deleteTarget.name}" deleted`);
              setDeleteTarget(null);
            },
            onError: (err) => {
              toast.error(`Failed to delete snapshot: ${err.message}`);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
