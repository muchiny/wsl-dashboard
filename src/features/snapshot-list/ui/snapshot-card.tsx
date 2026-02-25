import { Trash2, RotateCw, Archive, Clock, HardDrive } from "lucide-react";
import type { Snapshot } from "@/shared/types/snapshot";
import { formatBytes, formatRelativeTime } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";

interface SnapshotCardProps {
  snapshot: Snapshot;
  onDelete: () => void;
  onRestore: () => void;
}

export function SnapshotCard({ snapshot, onDelete, onRestore }: SnapshotCardProps) {
  const isCompleted = snapshot.status === "completed";
  const isInProgress = snapshot.status === "in_progress";
  const isFailed = snapshot.status.startsWith("failed");

  return (
    <div className="border-border bg-card hover:border-primary/50 rounded-lg border p-4 transition-colors">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Archive className="text-primary h-4 w-4 shrink-0" />
            <h4 className="truncate font-semibold">{snapshot.name}</h4>
          </div>
          {snapshot.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {snapshot.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            "ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isCompleted && "bg-success/20 text-success",
            isInProgress && "bg-warning/20 text-warning",
            isFailed && "bg-destructive/20 text-destructive",
          )}
        >
          {isCompleted ? "Completed" : isInProgress ? "In Progress" : "Failed"}
        </span>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {snapshot.distro_name}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(snapshot.created_at)}
        </span>
        {snapshot.file_size_bytes > 0 && <span>{formatBytes(snapshot.file_size_bytes)}</span>}
        <span className="border-border rounded border px-1.5 py-0.5">{snapshot.format}</span>
        <span className="border-border rounded border px-1.5 py-0.5">{snapshot.snapshot_type}</span>
      </div>

      <div className="mt-3 flex justify-end gap-1">
        {isCompleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            className="text-muted-foreground hover:bg-accent hover:text-primary rounded p-1.5 transition-colors"
            title="Restore snapshot"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-muted-foreground hover:bg-accent hover:text-destructive rounded p-1.5 transition-colors"
          title="Delete snapshot"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
