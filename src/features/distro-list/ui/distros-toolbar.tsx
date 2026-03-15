import { DistroSearchBar } from "./toolbar/distro-search-bar";
import { DistroFilterBar } from "./toolbar/distro-filter-bar";
import { DistroBulkActions } from "./toolbar/distro-bulk-actions";
import type { StatusFilter, WslVersionFilter } from "../hooks/use-distro-filter";
import type { Distro } from "@/shared/types/distro";

interface DistrosToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  wslVersionFilter: WslVersionFilter;
  onWslVersionFilterChange: (value: WslVersionFilter) => void;
  distros: Distro[] | undefined;
  onNewSnapshot: () => void;
  onShutdownAll: () => void;
  shutdownAllPending: boolean;
  running: number;
  stopped: number;
  total: number;
}

export function DistrosToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  wslVersionFilter,
  onWslVersionFilterChange,
  distros,
  onNewSnapshot,
  onShutdownAll,
  shutdownAllPending,
  running,
  stopped,
  total,
}: DistrosToolbarProps) {
  return (
    <div className="glass-panel relative z-20 space-y-2 rounded-xl p-3">
      {/* Row 1: Search + Refresh + View toggle */}
      <DistroSearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />

      {/* Row 2: Filters + Sort (recessed) */}
      <DistroFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        wslVersionFilter={wslVersionFilter}
        onWslVersionFilterChange={onWslVersionFilterChange}
      />

      {/* Row 3: Stats + Bulk actions */}
      <DistroBulkActions
        distros={distros}
        running={running}
        stopped={stopped}
        total={total}
        onNewSnapshot={onNewSnapshot}
        onShutdownAll={onShutdownAll}
        shutdownAllPending={shutdownAllPending}
      />
    </div>
  );
}
