import { useState } from "react";
import { DistroList } from "@/features/distro-list/ui/distro-list";
import { DistrosToolbar } from "@/features/distro-list/ui/distros-toolbar";
import { DistroDetailDrawer } from "@/features/distro-list/ui/distro-detail-drawer";
import { useDistros } from "@/shared/api/distro-queries";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import { useDistroFilter } from "@/features/distro-list/hooks/use-distro-filter";
import { useDistroDialogs } from "@/features/distro-list/hooks/use-distro-dialogs";

export function DistrosPage() {
  const { data: distros, isLoading, error } = useDistros();
  const viewMode = usePreferencesStore((s) => s.viewMode);

  const [selectedDistro, setSelectedDistro] = useState<string | null>(null);

  const handleSelectDistro = (distroName: string) => {
    setSelectedDistro((prev) => (prev === distroName ? null : distroName));
  };

  const filter = useDistroFilter(distros);
  const dialogs = useDistroDialogs();

  return (
    <div className="flex h-full gap-4">
      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto">
        <DistrosToolbar
          searchQuery={filter.searchQuery}
          onSearchChange={filter.setSearchQuery}
          statusFilter={filter.statusFilter}
          onStatusFilterChange={filter.setStatusFilter}
          wslVersionFilter={filter.wslVersionFilter}
          onWslVersionFilterChange={filter.setWslVersionFilter}
          distros={distros}
          onNewSnapshot={() => dialogs.openCreateSnapshot()}
          onShutdownAll={dialogs.openShutdownConfirm}
          shutdownAllPending={dialogs.shutdownAllPending}
          running={filter.running}
          stopped={filter.stopped}
          total={filter.total}
        />

        <DistroList
          distros={filter.processedDistros}
          isLoading={isLoading}
          error={error}
          viewMode={viewMode}
          isFiltered={filter.isFiltered}
          onSnapshot={(name) => dialogs.openCreateSnapshot(name)}
          onDelete={dialogs.openDelete}
          selectedDistro={selectedDistro}
          onSelectDistro={handleSelectDistro}
        />
      </div>

      {/* Right drawer for snapshot details */}
      {selectedDistro && (
        <DistroDetailDrawer
          distroName={selectedDistro}
          onRestore={dialogs.openRestore}
          onCreateSnapshot={() => dialogs.openCreateSnapshot(selectedDistro)}
          onClose={() => setSelectedDistro(null)}
        />
      )}

      <dialogs.DialogsRenderer running={filter.running} />
    </div>
  );
}
