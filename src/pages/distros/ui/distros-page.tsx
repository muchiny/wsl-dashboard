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
            <p className="text-subtext-0 text-xs font-medium tracking-wider uppercase">Total</p>
            <p className="text-text text-xl font-bold sm:text-2xl">{total}</p>
          </div>
          <div className="bg-surface-1 h-8 w-px" />
          <div>
            <p className="text-subtext-0 text-xs font-medium tracking-wider uppercase">Running</p>
            <p className="text-green text-xl font-bold sm:text-2xl">{running}</p>
          </div>
          <div className="bg-surface-1 h-8 w-px" />
          <div>
            <p className="text-subtext-0 text-xs font-medium tracking-wider uppercase">Stopped</p>
            <p className="text-subtext-0 text-xl font-bold sm:text-2xl">{stopped}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setCreateForDistro("");
              setCreateOpen(true);
            }}
            className="bg-mauve/15 text-mauve hover:bg-mauve/25 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4 sm:py-2.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span> Snapshot
          </button>
          <button
            onClick={() => shutdownAll.mutate()}
            disabled={shutdownAll.isPending || running === 0}
            className="bg-red/15 text-red hover:bg-red/25 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 sm:px-4 sm:py-2.5"
          >
            <Power className="h-4 w-4" />
            {shutdownAll.isPending ? "Shutting down..." : "Shutdown All"}
          </button>
        </div>
      </div>

      {/* Distro Grid */}
      <DistroList onSnapshot={handleSnapshot} />

      {/* Snapshots Section */}
      <div className="border-surface-1 bg-mantle rounded-xl border">
        <button
          onClick={() => setShowSnapshots(!showSnapshots)}
          className="hover:bg-surface-0/50 flex w-full items-center justify-between px-5 py-4 text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Archive className="text-mauve h-5 w-5" />
            <h3 className="text-text text-base font-semibold">Snapshots</h3>
          </div>
          {showSnapshots ? (
            <ChevronUp className="text-subtext-0 h-4 w-4" />
          ) : (
            <ChevronDown className="text-subtext-0 h-4 w-4" />
          )}
        </button>
        {showSnapshots && (
          <div className="border-surface-0 border-t p-5">
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
