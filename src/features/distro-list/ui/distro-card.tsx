import { Play, Square, RotateCw, Star, Archive, Activity, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Distro } from "@/shared/types/distro";
import { cn } from "@/shared/lib/utils";

interface DistroCardProps {
  distro: Distro;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSnapshot: () => void;
  pendingAction?: string;
}

export function DistroCard({
  distro,
  onStart,
  onStop,
  onRestart,
  onSnapshot,
  pendingAction,
}: DistroCardProps) {
  const isRunning = distro.state === "Running";
  const isPending = !!pendingAction;

  return (
    <div className="group border-surface-1 bg-mantle hover:border-blue/40 hover:shadow-blue/5 rounded-xl border p-5 transition-all duration-200 hover:shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isRunning ? "bg-green shadow-green/50 shadow-[0_0_8px]" : "bg-surface-2",
            )}
          />
          <h3 className="text-text text-base font-semibold">{distro.name}</h3>
          {distro.is_default && <Star className="fill-yellow text-yellow h-3.5 w-3.5" />}
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
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
      </div>

      {/* Info row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="bg-surface-0 text-subtext-0 rounded-md px-2 py-0.5 text-xs">
          WSL {distro.wsl_version}
        </span>
      </div>

      {/* Actions */}
      <div className="border-surface-0 mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex gap-1">
          {!isRunning && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              disabled={isPending}
              className="text-subtext-0 hover:bg-green/15 hover:text-green flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
              title="Start"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </button>
          )}
          {isRunning && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestart();
                }}
                disabled={isPending}
                className="text-subtext-0 hover:bg-yellow/15 hover:text-yellow flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
                title="Restart"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Restart
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                disabled={isPending}
                className="text-subtext-0 hover:bg-red/15 hover:text-red flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
                title="Stop"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            </>
          )}
        </div>

        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSnapshot();
            }}
            className="text-subtext-0 hover:bg-mauve/15 hover:text-mauve flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            title="Create snapshot"
          >
            <Archive className="h-3.5 w-3.5" />
            Snapshot
          </button>
          {isRunning && (
            <Link
              to="/monitoring"
              className="text-subtext-0 hover:bg-sapphire/15 hover:text-sapphire flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              title="View monitoring"
            >
              <Activity className="h-3.5 w-3.5" />
              Monitor
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
