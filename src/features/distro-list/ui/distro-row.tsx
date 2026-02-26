import {
  Play,
  Square,
  RotateCw,
  Star,
  Archive,
  Activity,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Distro } from "@/shared/types/distro";
import { cn } from "@/shared/lib/utils";
import { formatBytes } from "@/shared/lib/formatters";

interface DistroRowProps {
  distro: Distro;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSnapshot: () => void;
  pendingAction?: string;
  snapshotCount: number;
}

export function DistroRow({
  distro,
  onStart,
  onStop,
  onRestart,
  onSnapshot,
  pendingAction,
  snapshotCount,
}: DistroRowProps) {
  const isRunning = distro.state === "Running";
  const isPending = !!pendingAction;

  return (
    <div className="border-surface-1 bg-mantle hover:border-blue/40 flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors">
      {/* Name + status dot + default star */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            isRunning
              ? "bg-green shadow-green/50 shadow-[0_0_8px]"
              : "bg-surface-2",
          )}
          aria-hidden="true"
        />
        <span className="text-text truncate text-sm font-semibold">
          {distro.name}
        </span>
        {distro.is_default && (
          <Star
            className="fill-yellow text-yellow h-3.5 w-3.5 shrink-0"
            aria-label="Default distribution"
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
        {isPending ? pendingAction : distro.state}
      </span>

      {/* WSL version */}
      <span className="bg-surface-0 text-subtext-0 shrink-0 rounded-md px-2 py-0.5 text-xs">
        WSL {distro.wsl_version}
      </span>

      {/* VHDX size */}
      <span className="text-subtext-0 w-20 shrink-0 text-right text-xs">
        {distro.vhdx_size_bytes != null
          ? formatBytes(distro.vhdx_size_bytes)
          : "—"}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 gap-1">
        {!isRunning && (
          <button
            onClick={onStart}
            disabled={isPending}
            className="text-subtext-0 hover:bg-green/15 hover:text-green rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-40"
            aria-label={`Start ${distro.name}`}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {isRunning && (
          <>
            <button
              onClick={onRestart}
              disabled={isPending}
              className="text-subtext-0 hover:bg-yellow/15 hover:text-yellow rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-40"
              aria-label={`Restart ${distro.name}`}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onStop}
              disabled={isPending}
              className="text-subtext-0 hover:bg-red/15 hover:text-red rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-40"
              aria-label={`Stop ${distro.name}`}
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button
          onClick={onSnapshot}
          className="text-subtext-0 hover:bg-mauve/15 hover:text-mauve rounded-lg p-1.5 transition-colors"
          aria-label={`Create snapshot of ${distro.name}`}
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
        {isRunning && (
          <Link
            to="/monitoring"
            search={{ distro: distro.name }}
            className="text-subtext-0 hover:bg-sapphire/15 hover:text-sapphire rounded-lg p-1.5 transition-colors"
            aria-label={`Monitor ${distro.name}`}
          >
            <Activity className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
