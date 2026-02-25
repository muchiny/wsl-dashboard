import { useState } from "react";
import { Power, Plus, Archive, ChevronDown, ChevronUp } from "lucide-react";
import { DistroList } from "@/features/distro-list/ui/distro-list";
import { useDistroEvents } from "@/features/distro-events/hooks/use-distro-events";
import { useDistros } from "@/features/distro-list/api/queries";
import { useShutdownAll } from "@/features/distro-list/api/mutations";
import { SnapshotList } from "@/features/snapshot-list/ui/snapshot-list";
import { CreateSnapshotDialog } from "@/features/snapshot-list/ui/create-snapshot-dialog";
import { RestoreSnapshotDialog } from "@/features/snapshot-list/ui/restore-snapshot-dialog";

export function DistrosPage() {
  useDistroEvents();
  const { data: distros } = useDistros();
  const shutdownAll = useShutdownAll();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForDistro, setCreateForDistro] = useState("");
  const [restoreSnapshotId, setRestoreSnapshotId] = useState<string | null>(null);
  const [showSnapshots, setShowSnapshots] = useState(true);

  const running = distros?.filter((d) => d.state === "Running").length ?? 0;
  const stopped = (distros?.length ?? 0) - running;
  const total = distros?.length ?? 0;

  const handleSnapshot = (distroName: string) => {
    setCreateForDistro(distroName);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-subtext-0">Total</p>
            <p className="text-xl font-bold text-text sm:text-2xl">{total}</p>
          </div>
          <div className="h-8 w-px bg-surface-1" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-subtext-0">Running</p>
            <p className="text-xl font-bold text-green sm:text-2xl">{running}</p>
          </div>
          <div className="h-8 w-px bg-surface-1" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-subtext-0">Stopped</p>
            <p className="text-xl font-bold text-subtext-0 sm:text-2xl">{stopped}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setCreateForDistro("");
              setCreateOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-mauve/15 px-3 py-2 text-sm font-medium text-mauve transition-colors hover:bg-mauve/25 sm:px-4 sm:py-2.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span> Snapshot
          </button>
          <button
            onClick={() => shutdownAll.mutate()}
            disabled={shutdownAll.isPending || running === 0}
            className="flex items-center gap-2 rounded-lg bg-red/15 px-3 py-2 text-sm font-medium text-red transition-colors hover:bg-red/25 disabled:opacity-40 sm:px-4 sm:py-2.5"
          >
            <Power className="h-4 w-4" />
            {shutdownAll.isPending ? "Shutting down..." : "Shutdown All"}
          </button>
        </div>
      </div>

      {/* Distro Grid */}
      <DistroList onSnapshot={handleSnapshot} />

      {/* Snapshots Section */}
      <div className="rounded-xl border border-surface-1 bg-mantle">
        <button
          onClick={() => setShowSnapshots(!showSnapshots)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-0/50"
        >
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-mauve" />
            <h3 className="text-base font-semibold text-text">Snapshots</h3>
          </div>
          {showSnapshots ? (
            <ChevronUp className="h-4 w-4 text-subtext-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-subtext-0" />
          )}
        </button>
        {showSnapshots && (
          <div className="border-t border-surface-0 p-5">
            <SnapshotList onRestore={(id) => setRestoreSnapshotId(id)} />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateSnapshotDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDistro={createForDistro}
      />
      <RestoreSnapshotDialog
        open={!!restoreSnapshotId}
        snapshotId={restoreSnapshotId}
        onClose={() => setRestoreSnapshotId(null)}
      />
    </div>
  );
}
