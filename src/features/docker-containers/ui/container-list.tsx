import { Play, Square, Box } from "lucide-react";
import type { Container } from "@/shared/types/docker";
import { formatRelativeTime } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";

interface ContainerListProps {
  containers: Container[];
  distroName: string;
  onStart: (containerId: string) => void;
  onStop: (containerId: string) => void;
}

export function ContainerList({
  containers,
  distroName: _distroName,
  onStart,
  onStop,
}: ContainerListProps) {
  if (containers.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-lg border p-6 text-center">
        No containers found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {containers.map((container) => {
        const isRunning = container.state === "Running";
        return (
          <div
            key={container.id}
            className="border-border bg-card hover:border-primary/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Box
                className={cn("h-5 w-5", isRunning ? "text-success" : "text-muted-foreground")}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{container.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      isRunning ? "bg-success/20 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {container.state}
                  </span>
                </div>
                <div className="text-muted-foreground flex gap-3 text-xs">
                  <span>{container.image}</span>
                  <span>{container.status}</span>
                  {container.ports.length > 0 && (
                    <span>
                      {container.ports
                        .map((p) =>
                          p.host_port
                            ? `${p.host_port}:${p.container_port}`
                            : `${p.container_port}`,
                        )
                        .join(", ")}
                    </span>
                  )}
                  <span>{formatRelativeTime(container.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {!isRunning && (
                <button
                  onClick={() => onStart(container.id)}
                  className="text-muted-foreground hover:bg-accent hover:text-success rounded p-1.5 transition-colors"
                  title="Start container"
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              {isRunning && (
                <button
                  onClick={() => onStop(container.id)}
                  className="text-muted-foreground hover:bg-accent hover:text-destructive rounded p-1.5 transition-colors"
                  title="Stop container"
                >
                  <Square className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
