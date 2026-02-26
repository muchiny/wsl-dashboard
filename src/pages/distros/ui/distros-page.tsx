import { useState, useMemo } from "react";
import { DistroList } from "@/features/distro-list/ui/distro-list";
import { DistrosToolbar } from "@/features/distro-list/ui/distros-toolbar";
import { useDistroEvents } from "@/features/distro-events/hooks/use-distro-events";
import { useDistros } from "@/features/distro-list/api/queries";
import { useShutdownAll } from "@/features/distro-list/api/mutations";
import { CreateSnapshotDialog } from "@/features/snapshot-list/ui/create-snapshot-dialog";
import { RestoreSnapshotDialog } from "@/features/snapshot-list/ui/restore-snapshot-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/ui/toast-store";
import { useDebounce } from "@/shared/hooks/use-debounce";
import {
  usePreferencesStore,
  type SortKey,
} from "@/shared/stores/use-preferences-store";
import type { Distro } from "@/shared/types/distro";

const SORT_COMPARATORS: Record<SortKey, (a: Distro, b: Distro) => number> = {
  "name-asc": (a, b) => a.name.localeCompare(b.name),
  "name-desc": (a, b) => b.name.localeCompare(a.name),
  "status-running": (a, b) => {
    if (a.state === "Running" && b.state !== "Running") return -1;
    if (a.state !== "Running" && b.state === "Running") return 1;
    return a.name.localeCompare(b.name);
  },
  "status-stopped": (a, b) => {
    if (a.state === "Stopped" && b.state !== "Stopped") return -1;
    if (a.state !== "Stopped" && b.state === "Stopped") return 1;
    return a.name.localeCompare(b.name);
  },
  "default-first": (a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return a.name.localeCompare(b.name);
  },
  "vhdx-size": (a, b) => {
    const sizeA = a.vhdx_size_bytes ?? 0;
    const sizeB = b.vhdx_size_bytes ?? 0;
    return sizeB - sizeA;
  },
};

export function DistrosPage() {
  useDistroEvents();
  const { data: distros, isLoading, error } = useDistros();
  const shutdownAll = useShutdownAll();

  // Ephemeral filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [wslVersionFilter, setWslVersionFilter] = useState<"all" | 1 | 2>("all");

  // Persisted preferences
  const { sortKey, viewMode } = usePreferencesStore();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForDistro, setCreateForDistro] = useState("");
  const [restoreSnapshotId, setRestoreSnapshotId] = useState<string | null>(null);
  const [restoreDistroName, setRestoreDistroName] = useState("");
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 200);

  // Stats from raw data (always reflects true state)
  const running = distros?.filter((d) => d.state === "Running").length ?? 0;
  const stopped = (distros?.length ?? 0) - running;
  const total = distros?.length ?? 0;

  const isFiltered =
    debouncedSearch !== "" || statusFilter !== "all" || wslVersionFilter !== "all";

  const processedDistros = useMemo(() => {
    let result = distros ?? [];

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(lower));
    }

    if (statusFilter === "running") {
      result = result.filter((d) => d.state === "Running");
    } else if (statusFilter === "stopped") {
      result = result.filter((d) => d.state === "Stopped");
    }

    if (wslVersionFilter !== "all") {
      result = result.filter((d) => d.wsl_version === wslVersionFilter);
    }

    return [...result].sort(SORT_COMPARATORS[sortKey]);
  }, [distros, debouncedSearch, statusFilter, wslVersionFilter, sortKey]);

  const handleSnapshot = (distroName: string) => {
    setCreateForDistro(distroName);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <DistrosToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        wslVersionFilter={wslVersionFilter}
        onWslVersionFilterChange={setWslVersionFilter}
        distros={distros}
        onNewSnapshot={() => {
          setCreateForDistro("");
          setCreateOpen(true);
        }}
        onShutdownAll={() => setShowShutdownConfirm(true)}
        shutdownAllPending={shutdownAll.isPending}
        running={running}
        stopped={stopped}
        total={total}
      />

      {/* Distro List */}
      <DistroList
        distros={processedDistros}
        isLoading={isLoading}
        error={error}
        viewMode={viewMode}
        isFiltered={isFiltered}
        onSnapshot={handleSnapshot}
        onRestore={(id, distroName) => {
          setRestoreSnapshotId(id);
          setRestoreDistroName(distroName);
        }}
      />

      {/* Dialogs */}
      <CreateSnapshotDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDistro={createForDistro}
      />
      <RestoreSnapshotDialog
        open={!!restoreSnapshotId}
        snapshotId={restoreSnapshotId}
        distroName={restoreDistroName}
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
