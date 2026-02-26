import { Archive, Plus } from "lucide-react";
import { SnapshotList } from "@/features/snapshot-list/ui/snapshot-list";

interface DistroSnapshotPanelProps {
  distroName: string;
  onRestore: (snapshotId: string, distroName: string) => void;
  onCreateSnapshot: () => void;
}

export function DistroSnapshotPanel({
  distroName,
  onRestore,
  onCreateSnapshot,
}: DistroSnapshotPanelProps) {
  return (
    <div className="border-surface-1 bg-mantle/50 border-mauve/30 expand-down col-span-full rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">Snapshots — {distroName}</h4>
        </div>
        <button
          onClick={onCreateSnapshot}
          className="bg-mauve/15 text-mauve hover:bg-mauve/25 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Snapshot
        </button>
      </div>
      <SnapshotList distroName={distroName} onRestore={onRestore} hideDistroName />
    </div>
  );
}
