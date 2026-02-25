import { useSnapshots } from "../api/queries";
import { useDeleteSnapshot } from "../api/mutations";
import { SnapshotCard } from "./snapshot-card";

interface SnapshotListProps {
  distroName?: string;
  onRestore: (snapshotId: string) => void;
}

export function SnapshotList({ distroName, onRestore }: SnapshotListProps) {
  const { data: snapshots, isLoading, error } = useSnapshots(distroName);
  const deleteSnapshot = useDeleteSnapshot();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-surface-1 bg-base" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red/30 bg-red/10 p-4 text-red">
        Failed to load snapshots: {error.message}
      </div>
    );
  }

  if (!snapshots?.length) {
    return (
      <div className="py-6 text-center text-sm text-subtext-0">
        No snapshots yet. Use the Snapshot button on a distribution to create one.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {snapshots.map((snapshot) => (
        <SnapshotCard
          key={snapshot.id}
          snapshot={snapshot}
          onDelete={() => deleteSnapshot.mutate(snapshot.id)}
          onRestore={() => onRestore(snapshot.id)}
        />
      ))}
    </div>
  );
}
