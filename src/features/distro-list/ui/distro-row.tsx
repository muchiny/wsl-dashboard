import { memo } from "react";
import { Star, Archive, Loader2 } from "lucide-react";
import type { Distro } from "@/shared/types/distro";
import { cn } from "@/shared/lib/utils";
import { formatBytes } from "@/shared/lib/formatters";
import { useDistroActions } from "../hooks/use-distro-actions";
import { DistroActions } from "./distro-actions";

interface DistroRowProps {
  distro: Distro;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSnapshot: () => void;
  pendingAction?: string;
  snapshotCount: number;
  onSelect: () => void;
  isSelected: boolean;
}

export const DistroRow = memo(function DistroRow({
  distro,
  onStart,
  onStop,
  onRestart,
  onSnapshot,
  pendingAction,
  snapshotCount,
  onSelect,
  isSelected,
}: DistroRowProps) {
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
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      className={cn(
        "glass-card-lite focus-ring flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-colors",
        isSelected ? "border-mauve/50" : "hover:border-blue/40",
      )}
    >
      {/* Name + status dot + default star */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            isRunning ? "bg-green shadow-[0_0_12px_rgba(48,209,88,0.6)]" : "bg-surface-2",
          )}
          aria-hidden="true"
        />
        <span className="text-text truncate text-sm font-semibold">{distro.name}</span>
        {distro.is_default && (
          <Star
            className="fill-yellow text-yellow h-3.5 w-3.5 shrink-0"
            aria-label={t("distros.defaultDistribution")}
          />
        )}
        {snapshotCount > 0 && (
          <span className="bg-mauve/15 text-mauve inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
            <Archive className="h-3 w-3" aria-hidden="true" />
            {snapshotCount}
          </span>
        )}
      </div>

      {/* State badge */}
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
          isPending
            ? "bg-yellow/15 text-yellow"
            : isRunning
              ? "bg-green/15 text-green"
              : "bg-surface-0 text-subtext-0",
        )}
      >
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {isPending ? pendingAction : stateLabel}
      </span>

      {/* WSL version */}
      <span className="bg-surface-0 text-subtext-0 shrink-0 rounded-md px-2 py-0.5 text-xs">
        WSL {distro.wsl_version}
      </span>

      {/* VHDX size */}
      <span className="text-subtext-0 w-20 shrink-0 text-right text-xs">
        {distro.vhdx_size_bytes != null ? formatBytes(distro.vhdx_size_bytes) : "—"}
      </span>

      {/* Actions */}
      <DistroActions
        t={t}
        isRunning={isRunning}
        isPending={isPending}
        createTerminalSession={createTerminalSession}
        handleStart={handleStart}
        handleStop={handleStop}
        handleRestart={handleRestart}
        handleSnapshot={handleSnapshot}
        handleTerminal={handleTerminal}
        handleMonitorClick={handleMonitorClick}
        distroName={distro.name}
        pendingAction={pendingAction}
      />
    </div>
  );
});
