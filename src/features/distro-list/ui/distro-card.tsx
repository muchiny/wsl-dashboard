import { memo } from "react";
import { Star, Archive, Loader2 } from "lucide-react";
import type { Distro } from "@/shared/types/distro";
import { cn } from "@/shared/lib/utils";
import { useDistroActions } from "../hooks/use-distro-actions";
import { DistroActions } from "./distro-actions";

interface DistroCardProps {
  distro: Distro;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  onRestart: (name: string) => void;
  onSnapshot: (name: string) => void;
  onDelete: (name: string) => void;
  pendingAction?: string;
  onSelect: (name: string) => void;
  isSelected: boolean;
  snapshotCount: number;
}

export const DistroCard = memo(function DistroCard({
  distro,
  onStart,
  onStop,
  onRestart,
  onSnapshot,
  onDelete,
  pendingAction,
  onSelect,
  isSelected,
  snapshotCount,
}: DistroCardProps) {
  const {
    t,
    isRunning,
    isPending,
    stateLabel,
    createTerminalSession,
    handleKeyDown,
    handleStart,
    handleStop,
    handleRestart,
    handleSnapshot,
    handleDelete,
    handleTerminal,
    handleMonitorClick,
    ariaLabel,
  } = useDistroActions({
    distro,
    pendingAction,
    onStart,
    onStop,
    onRestart,
    onSnapshot,
    onExpand: onSelect,
    onDelete,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(distro.name)}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      className={cn(
        "group glass-card-lite focus-ring cursor-pointer rounded-xl p-5 shadow-elevation-1 transition-all duration-200",
        isSelected
          ? "border-mauve/40 shadow-elevation-2 neon-glow-purple"
          : "hover:border-blue/30 hover:shadow-elevation-2 hover:-translate-y-0.5 active:translate-y-0",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all",
              isRunning ? "bg-green shadow-[0_0_12px_rgba(166,227,161,0.6)] animate-pulse" : "bg-surface-2",
            )}
            aria-hidden="true"
          />
          <h3 className="text-text text-base font-semibold">{distro.name}</h3>
          {distro.is_default && (
            <Star
              className="fill-yellow text-yellow h-3.5 w-3.5"
              aria-label={t("distros.defaultDistribution")}
            />
          )}
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            isPending
              ? "bg-yellow/25 text-yellow"
              : isRunning
                ? "bg-green/25 text-green"
                : "bg-surface-0 text-subtext-0",
          )}
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          {isPending ? pendingAction : stateLabel}
        </span>
      </div>

      {/* Info row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="bg-surface-0 text-subtext-0 rounded-md px-2 py-0.5 text-xs">
          WSL {distro.wsl_version}
        </span>
        {snapshotCount > 0 && (
          <span className="bg-mauve/25 text-mauve inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
            <Archive className="h-3 w-3" aria-hidden="true" />
            {snapshotCount}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <DistroActions
          t={t}
          isRunning={isRunning}
          isPending={isPending}
          createTerminalSession={createTerminalSession}
          handleStart={handleStart}
          handleStop={handleStop}
          handleRestart={handleRestart}
          handleSnapshot={handleSnapshot}
          handleDelete={handleDelete}
          handleTerminal={handleTerminal}
          handleMonitorClick={handleMonitorClick}
          distroName={distro.name}
          pendingAction={pendingAction}
        />
      </div>
    </div>
  );
});
