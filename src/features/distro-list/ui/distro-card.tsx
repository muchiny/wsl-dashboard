import { Play, Square, RotateCw, Star } from "lucide-react";
import type { Distro } from "@/shared/types/distro";
import { cn } from "@/shared/lib/utils";

interface DistroCardProps {
  distro: Distro;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}

export function DistroCard({ distro, onStart, onStop, onRestart }: DistroCardProps) {
  const isRunning = distro.state === "Running";

  return (
    <div className="border-border bg-card hover:border-primary/50 rounded-lg border p-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {distro.is_default && <Star className="fill-warning text-warning h-4 w-4" />}
          <h3 className="font-semibold">{distro.name}</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            isRunning ? "bg-success/20 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {distro.state}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="border-border text-muted-foreground rounded border px-2 py-0.5 text-xs">
          WSL {distro.wsl_version}
        </span>

        <div className="flex gap-1">
          {!isRunning && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="text-muted-foreground hover:bg-accent hover:text-success rounded p-1.5 transition-colors"
              title="Start"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {isRunning && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestart();
                }}
                className="text-muted-foreground hover:bg-accent hover:text-warning rounded p-1.5 transition-colors"
                title="Restart"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                className="text-muted-foreground hover:bg-accent hover:text-destructive rounded p-1.5 transition-colors"
                title="Stop"
              >
                <Square className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
