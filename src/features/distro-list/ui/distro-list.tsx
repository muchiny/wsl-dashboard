import { useTranslation, Trans } from "react-i18next";
import { Server, Search } from "lucide-react";
import { useStartDistro, useStopDistro, useRestartDistro } from "../api/mutations";
import { useSnapshotCounts } from "@/features/snapshot-list/api/queries";
import { DistroCard } from "./distro-card";
import { DistroRow } from "./distro-row";
import type { Distro } from "@/shared/types/distro";
import type { ViewMode } from "@/shared/stores/use-preferences-store";

interface DistroListProps {
  distros: Distro[];
  isLoading: boolean;
  error: Error | null;
  viewMode: ViewMode;
  isFiltered: boolean;
  onSnapshot: (distroName: string) => void;
  selectedDistro: string | null;
  onSelectDistro: (distroName: string) => void;
}

export function DistroList({
  distros,
  isLoading,
  error,
  viewMode,
  isFiltered,
  onSnapshot,
  selectedDistro,
  onSelectDistro,
}: DistroListProps) {
  const { t } = useTranslation();
  const startDistro = useStartDistro();
  const stopDistro = useStopDistro();
  const restartDistro = useRestartDistro();
  const snapshotCounts = useSnapshotCounts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card-lite h-36 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-red/30 bg-red/10 text-red rounded-xl border p-4">
        {t("distros.failedToLoad", { message: error.message })}
      </div>
    );
  }

  if (distros.length === 0 && isFiltered) {
    return (
      <div className="glass-card flex flex-col items-center rounded-xl px-8 py-12 text-center">
        <Search className="text-surface-2 mb-3 h-10 w-10" />
        <p className="text-text font-medium">{t("distros.noMatchingFilters")}</p>
        <p className="text-subtext-0 mt-1 text-sm">{t("distros.noMatchingFiltersHint")}</p>
      </div>
    );
  }

  if (distros.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center rounded-xl px-8 py-12 text-center">
        <Server className="text-surface-2 mb-3 h-10 w-10" />
        <p className="text-text font-medium">{t("distros.noDistrosFound")}</p>
        <p className="text-subtext-0 mt-1 text-sm">
          <Trans
            i18nKey="distros.noDistrosFoundHint"
            components={{
              code: <code className="bg-surface-0 rounded px-1.5 py-0.5 font-mono text-xs" />,
            }}
          />
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
            ? t("distros.pendingStarting")
            : stopDistro.isPending
              ? t("distros.pendingStopping")
              : t("distros.pendingRestarting"),
        }
      : null;

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {distros.map((distro) => (
          <DistroRow
            key={distro.name}
            distro={distro}
            onStart={startDistro.mutate}
            onStop={stopDistro.mutate}
            onRestart={restartDistro.mutate}
            onSnapshot={onSnapshot}
            pendingAction={pendingAction?.distro === distro.name ? pendingAction.action : undefined}
            snapshotCount={snapshotCounts[distro.name] ?? 0}
            onSelect={onSelectDistro}
            isSelected={selectedDistro === distro.name}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {distros.map((distro) => (
        <DistroCard
          key={distro.name}
          distro={distro}
          onStart={startDistro.mutate}
          onStop={stopDistro.mutate}
          onRestart={restartDistro.mutate}
          onSnapshot={onSnapshot}
          pendingAction={pendingAction?.distro === distro.name ? pendingAction.action : undefined}
          onSelect={onSelectDistro}
          isSelected={selectedDistro === distro.name}
          snapshotCount={snapshotCounts[distro.name] ?? 0}
        />
      ))}
    </div>
  );
}
