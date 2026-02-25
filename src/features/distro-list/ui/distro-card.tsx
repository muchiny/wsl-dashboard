import { Play, Square, RotateCw, Star, Archive, Activity } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Distro } from "@/shared/types/distro";
import { cn } from "@/shared/lib/utils";

interface DistroCardProps {
  distro: Distro;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSnapshot: () => void;
}

export function DistroCard({ distro, onStart, onStop, onRestart, onSnapshot }: DistroCardProps) {
  const isRunning = distro.state === "Running";

  return (
    <div className="group rounded-xl border border-surface-1 bg-mantle p-5 transition-all duration-200 hover:border-blue/40 hover:shadow-lg hover:shadow-blue/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isRunning ? "bg-green shadow-[0_0_8px] shadow-green/50" : "bg-surface-2",
            )}
          />
          <h3 className="text-base font-semibold text-text">{distro.name}</h3>
          {distro.is_default && <Star className="h-3.5 w-3.5 fill-yellow text-yellow" />}
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            isRunning ? "bg-green/15 text-green" : "bg-surface-0 text-subtext-0",
          )}
        >
          {distro.state}
        </span>
      </div>

      {/* Info row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-md bg-surface-0 px-2 py-0.5 text-xs text-subtext-0">
          WSL {distro.wsl_version}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-surface-0 pt-4">
        <div className="flex gap-1">
          {!isRunning && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-subtext-0 transition-colors hover:bg-green/15 hover:text-green"
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
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-subtext-0 transition-colors hover:bg-yellow/15 hover:text-yellow"
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
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-subtext-0 transition-colors hover:bg-red/15 hover:text-red"
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
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-subtext-0 transition-colors hover:bg-mauve/15 hover:text-mauve"
            title="Create snapshot"
          >
            <Archive className="h-3.5 w-3.5" />
            Snapshot
          </button>
          {isRunning && (
            <Link
              to="/monitoring"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-subtext-0 transition-colors hover:bg-sapphire/15 hover:text-sapphire"
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
