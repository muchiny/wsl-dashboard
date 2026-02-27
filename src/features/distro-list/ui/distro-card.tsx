import {
  Play,
  Square,
  RotateCw,
  Star,
  Archive,
  Activity,
  Loader2,
  ChevronDown,
  TerminalSquare,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Distro } from "@/shared/types/distro";
import { cn } from "@/shared/lib/utils";
import { createTerminal } from "@/features/terminal/api/mutations";
import { useTerminalStore } from "@/features/terminal/model/use-terminal-store";

interface DistroCardProps {
  distro: Distro;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSnapshot: () => void;
  pendingAction?: string;
  onExpand: () => void;
  isExpanded: boolean;
  snapshotCount: number;
}

export function DistroCard({
  distro,
  onStart,
  onStop,
  onRestart,
  onSnapshot,
  pendingAction,
  onExpand,
  isExpanded,
  snapshotCount,
}: DistroCardProps) {
  const isRunning = distro.state === "Running";
  const isPending = !!pendingAction;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand();
        }
      }}
      aria-expanded={isExpanded}
      aria-label={`${distro.name} - ${distro.state}${distro.is_default ? " (default)" : ""}`}
      className={cn(
        "group border-surface-1 bg-mantle focus-ring cursor-pointer rounded-xl border p-5 transition-all duration-200",
        isExpanded
          ? "border-mauve/50 shadow-mauve/5 shadow-lg"
          : "hover:border-blue/40 hover:shadow-blue/5 hover:shadow-lg",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isRunning ? "bg-green shadow-green/50 shadow-[0_0_8px]" : "bg-surface-2",
            )}
            aria-hidden="true"
          />
          <h3 className="text-text text-base font-semibold">{distro.name}</h3>
          {distro.is_default && (
            <Star
              className="fill-yellow text-yellow h-3.5 w-3.5"
              aria-label="Default distribution"
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
          {isPending ? pendingAction : distro.state}
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
        <div className="flex-1" />
        <ChevronDown
          className={cn(
            "text-subtext-0 h-4 w-4 transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
          aria-hidden="true"
        />
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
              className="text-subtext-0 hover:bg-green/20 hover:text-green flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
              aria-label={`Start ${distro.name}`}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
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
                className="text-subtext-0 hover:bg-yellow/20 hover:text-yellow flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
                aria-label={`Restart ${distro.name}`}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                Restart
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                disabled={isPending}
                className="text-subtext-0 hover:bg-red/20 hover:text-red flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
                aria-label={`Stop ${distro.name}`}
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
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
            className="text-subtext-0 hover:bg-mauve/20 hover:text-mauve flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            aria-label={`Create snapshot of ${distro.name}`}
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Snapshot
          </button>
          {isRunning && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const sessionId = await createTerminal(distro.name);
                  useTerminalStore.getState().addSession({
                    id: sessionId,
                    distroName: distro.name,
                    title: distro.name,
                  });
                } catch (err) {
                  console.error("Failed to open terminal:", err);
                }
              }}
              className="text-subtext-0 hover:bg-teal/20 hover:text-teal flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              aria-label={`Open terminal in ${distro.name}`}
            >
              <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Terminal
            </button>
          )}
          {isRunning && (
            <Link
              to="/monitoring"
              search={{ distro: distro.name }}
              onClick={(e) => e.stopPropagation()}
              className="text-subtext-0 hover:bg-sapphire/20 hover:text-sapphire flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              aria-label={`Monitor ${distro.name}`}
            >
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Monitor
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
