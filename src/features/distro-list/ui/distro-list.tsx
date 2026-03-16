import { useCallback } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Server, Search } from "lucide-react";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { distroKeys, useDistros } from "@/shared/api/distro-queries";
import { toast } from "@/shared/ui/toast-store";
import { useSnapshotCounts } from "@/features/snapshot-list/api/queries";
import { usePendingActions } from "../hooks/use-pending-actions";
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
  onDelete: (distroName: string) => void;
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
  onDelete,
  selectedDistro,
  onSelectDistro,
}: DistroListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const snapshotCounts = useSnapshotCounts();
  const { hasPending, markPending, clearPending, getPending } = usePendingActions(distros);

  // Fast-poll (2s) while any action is pending so the UI updates as soon as state changes
  useDistros(hasPending);

  const handleStart = useCallback(
    (name: string) => {
      markPending(name, "Starting", "Running");
      tauriInvoke("start_distro", { name })
        .then(() => toast.success(t("distros.toastStarted", { name })))
        .catch((err: Error) => {
          toast.error(t("distros.toastStartFailed", { name, message: err.message }));
          clearPending(name);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: distroKeys.list() });
        });
    },
    [t, markPending, clearPending, queryClient],
  );

  const handleStop = useCallback(
    (name: string) => {
      markPending(name, "Stopping", "Stopped");
      tauriInvoke("stop_distro", { name })
        .then(() => toast.success(t("distros.toastStopped", { name })))
        .catch((err: Error) => {
          toast.error(t("distros.toastStopFailed", { name, message: err.message }));
          clearPending(name);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: distroKeys.list() });
        });
    },
    [t, markPending, clearPending, queryClient],
  );

  const handleRestart = useCallback(
    (name: string) => {
      markPending(name, "Restarting", "Running");
      tauriInvoke("restart_distro", { name })
        .then(() => toast.success(t("distros.toastRestarted", { name })))
        .catch((err: Error) => {
          toast.error(t("distros.toastRestartFailed", { name, message: err.message }));
          clearPending(name);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: distroKeys.list() });
        });
    },
    [t, markPending, clearPending, queryClient],
  );

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

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {distros.map((distro) => (
          <DistroRow
            key={distro.name}
            distro={distro}
            onStart={handleStart}
            onStop={handleStop}
            onRestart={handleRestart}
            onSnapshot={onSnapshot}
            onDelete={onDelete}
            pendingAction={getPending(distro.name)}
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
          onStart={handleStart}
          onStop={handleStop}
          onRestart={handleRestart}
          onSnapshot={onSnapshot}
          onDelete={onDelete}
          pendingAction={getPending(distro.name)}
          onSelect={onSelectDistro}
          isSelected={selectedDistro === distro.name}
          snapshotCount={snapshotCounts[distro.name] ?? 0}
        />
      ))}
    </div>
  );
}
