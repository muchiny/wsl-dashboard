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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-border bg-card h-32 animate-pulse rounded-lg border" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
        Failed to load snapshots: {error.message}
      </div>
    );
  }

  if (!snapshots?.length) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-lg border p-8 text-center">
        No snapshots yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
