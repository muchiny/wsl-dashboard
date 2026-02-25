import { useState } from "react";
import { Power, Plus } from "lucide-react";
import { DistroList } from "@/features/distro-list/ui/distro-list";
import { useDistroEvents } from "@/features/distro-events/hooks/use-distro-events";
import { useDistros } from "@/features/distro-list/api/queries";
import { useShutdownAll } from "@/features/distro-list/api/mutations";
import { CreateSnapshotDialog } from "@/features/snapshot-list/ui/create-snapshot-dialog";
import { RestoreSnapshotDialog } from "@/features/snapshot-list/ui/restore-snapshot-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/ui/toast";

export function DistrosPage() {
  useDistroEvents();
  const { data: distros } = useDistros();
  const shutdownAll = useShutdownAll();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForDistro, setCreateForDistro] = useState("");
  const [restoreSnapshotId, setRestoreSnapshotId] = useState<string | null>(null);
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);

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
          <div className="bg-surface-1 h-8 w-px" aria-hidden="true" />
          <div>
            <p className="text-subtext-0 text-xs font-medium tracking-wider uppercase">Running</p>
            <p className="text-green text-xl font-bold sm:text-2xl">{running}</p>
          </div>
          <div className="bg-surface-1 h-8 w-px" aria-hidden="true" />
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
            onClick={() => setShowShutdownConfirm(true)}
            disabled={shutdownAll.isPending || running === 0}
            className="bg-red/15 text-red hover:bg-red/25 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 sm:px-4 sm:py-2.5"
          >
            <Power className="h-4 w-4" />
            {shutdownAll.isPending ? "Shutting down..." : "Shutdown All"}
          </button>
        </div>
      </div>

      {/* Distro Grid with per-distro snapshot panels */}
      <DistroList onSnapshot={handleSnapshot} onRestore={(id) => setRestoreSnapshotId(id)} />

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
      <ConfirmDialog
        open={showShutdownConfirm}
        title="Shutdown all distributions"
        description={`This will terminate all ${running} running distribution${running > 1 ? "s" : ""}. Any unsaved work will be lost.`}
        confirmLabel="Shutdown All"
        variant="danger"
        isPending={shutdownAll.isPending}
        onConfirm={() => {
          shutdownAll.mutate(undefined, {
            onSuccess: () => {
              toast.success("All distributions shut down");
              setShowShutdownConfirm(false);
            },
            onError: (err) => {
              toast.error(`Shutdown failed: ${err.message}`);
            },
          });
        }}
        onCancel={() => setShowShutdownConfirm(false)}
      />
    </div>
  );
}
