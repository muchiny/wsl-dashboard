import { useState } from "react";
import { Plus, Archive } from "lucide-react";
import { useDistros } from "@/features/distro-list/api/queries";
import { SnapshotList } from "@/features/snapshot-list/ui/snapshot-list";
import { CreateSnapshotDialog } from "@/features/snapshot-list/ui/create-snapshot-dialog";
import { RestoreSnapshotDialog } from "@/features/snapshot-list/ui/restore-snapshot-dialog";

export function SnapshotsPage() {
  const { data: distros } = useDistros();
  const [createOpen, setCreateOpen] = useState(false);
  const [restoreSnapshotId, setRestoreSnapshotId] = useState<string | null>(null);
  const [filterDistro, setFilterDistro] = useState<string>("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="text-primary h-6 w-6" />
            <h2 className="text-2xl font-bold">Snapshots</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Create, manage, and restore distribution snapshots.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Snapshot
        </button>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by distro:</label>
        <select
          value={filterDistro}
          onChange={(e) => setFilterDistro(e.target.value)}
          className="border-border bg-background focus:border-primary rounded-md border px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">All distributions</option>
          {distros?.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <SnapshotList
        distroName={filterDistro || undefined}
        onRestore={(id) => setRestoreSnapshotId(id)}
      />

      <CreateSnapshotDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <RestoreSnapshotDialog
        open={!!restoreSnapshotId}
        snapshotId={restoreSnapshotId}
        onClose={() => setRestoreSnapshotId(null)}
      />
    </div>
  );
}
