import { useState, type ReactNode } from "react";
import { Server, Search } from "lucide-react";
import { useStartDistro, useStopDistro, useRestartDistro } from "../api/mutations";
import { useSnapshotCounts } from "@/features/snapshot-list/api/queries";
import { DistroCard } from "./distro-card";
import { DistroRow } from "./distro-row";
import { DistroSnapshotPanel } from "./distro-snapshot-panel";
import type { Distro } from "@/shared/types/distro";
import type { ViewMode } from "@/shared/stores/use-preferences-store";

interface DistroListProps {
  distros: Distro[];
  isLoading: boolean;
  error: Error | null;
  viewMode: ViewMode;
  isFiltered: boolean;
  onSnapshot: (distroName: string) => void;
  onRestore: (snapshotId: string, distroName: string) => void;
}

export function DistroList({
  distros,
  isLoading,
  error,
  viewMode,
  isFiltered,
  onSnapshot,
  onRestore,
}: DistroListProps) {
  const startDistro = useStartDistro();
  const stopDistro = useStopDistro();
  const restartDistro = useRestartDistro();
  const snapshotCounts = useSnapshotCounts();

  const [expandedDistro, setExpandedDistro] = useState<string | null>(null);

  const handleExpand = (distroName: string) => {
    setExpandedDistro((prev) => (prev === distroName ? null : distroName));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-surface-1 bg-mantle h-36 animate-pulse rounded-xl border"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-red/30 bg-red/10 text-red rounded-xl border p-4">
        Failed to load distributions: {error.message}
      </div>
    );
  }

  if (distros.length === 0 && isFiltered) {
    return (
      <div className="border-surface-1 bg-mantle flex flex-col items-center rounded-xl border px-8 py-12 text-center">
        <Search className="text-surface-2 mb-3 h-10 w-10" />
        <p className="text-text font-medium">No distributions match your filters</p>
        <p className="text-subtext-0 mt-1 text-sm">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  if (distros.length === 0) {
    return (
      <div className="border-surface-1 bg-mantle flex flex-col items-center rounded-xl border px-8 py-12 text-center">
        <Server className="text-surface-2 mb-3 h-10 w-10" />
        <p className="text-text font-medium">No distributions found</p>
        <p className="text-subtext-0 mt-1 text-sm">
          Install a WSL distribution to get started. Run{" "}
          <code className="bg-surface-0 rounded px-1.5 py-0.5 font-mono text-xs">
            wsl --install
          </code>{" "}
          in your terminal.
        </p>
      </div>
    );
  }

  const pendingAction =
    (startDistro.isPending && startDistro.variables) ||
    (stopDistro.isPending && stopDistro.variables) ||
    (restartDistro.isPending && restartDistro.variables)
      ? {
          distro:
            (startDistro.isPending && startDistro.variables) ||
            (stopDistro.isPending && stopDistro.variables) ||
            (restartDistro.isPending && restartDistro.variables) ||
            "",
          action: startDistro.isPending
            ? "Starting"
            : stopDistro.isPending
              ? "Stopping"
              : "Restarting",
        }
      : null;

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {distros.map((distro) => (
          <DistroRow
            key={distro.name}
            distro={distro}
            onStart={() => startDistro.mutate(distro.name)}
            onStop={() => stopDistro.mutate(distro.name)}
            onRestart={() => restartDistro.mutate(distro.name)}
            onSnapshot={() => onSnapshot(distro.name)}
            pendingAction={pendingAction?.distro === distro.name ? pendingAction.action : undefined}
            snapshotCount={snapshotCounts[distro.name] ?? 0}
          />
        ))}
      </div>
    );
  }

  const gridItems: ReactNode[] = [];
  for (const distro of distros) {
    gridItems.push(
      <DistroCard
        key={distro.name}
        distro={distro}
        onStart={() => startDistro.mutate(distro.name)}
        onStop={() => stopDistro.mutate(distro.name)}
        onRestart={() => restartDistro.mutate(distro.name)}
        onSnapshot={() => onSnapshot(distro.name)}
        pendingAction={pendingAction?.distro === distro.name ? pendingAction.action : undefined}
        onExpand={() => handleExpand(distro.name)}
        isExpanded={expandedDistro === distro.name}
        snapshotCount={snapshotCounts[distro.name] ?? 0}
      />,
    );

    if (expandedDistro === distro.name) {
      gridItems.push(
        <DistroSnapshotPanel
          key={`panel-${distro.name}`}
          distroName={distro.name}
          onRestore={onRestore}
          onCreateSnapshot={() => onSnapshot(distro.name)}
        />,
      );
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {gridItems}
    </div>
  );
}
