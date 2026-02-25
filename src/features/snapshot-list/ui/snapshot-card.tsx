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
    <div className="rounded-xl border border-surface-1 bg-base p-4 transition-all hover:border-mauve/40">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 shrink-0 text-mauve" />
            <h4 className="truncate font-semibold text-text">{snapshot.name}</h4>
          </div>
          {snapshot.description && (
            <p className="mt-1 line-clamp-2 text-sm text-subtext-0">{snapshot.description}</p>
          )}
        </div>
        <span
          className={cn(
            "ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isCompleted && "bg-green/15 text-green",
            isInProgress && "bg-yellow/15 text-yellow",
            isFailed && "bg-red/15 text-red",
          )}
        >
          {isCompleted ? "Completed" : isInProgress ? "In Progress" : "Failed"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtext-0">
        <span className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {snapshot.distro_name}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(snapshot.created_at)}
        </span>
        {snapshot.file_size_bytes > 0 && <span>{formatBytes(snapshot.file_size_bytes)}</span>}
        <span className="rounded-md bg-surface-0 px-1.5 py-0.5">{snapshot.format}</span>
        <span className="rounded-md bg-surface-0 px-1.5 py-0.5">{snapshot.snapshot_type}</span>
      </div>

      <div className="mt-3 flex justify-end gap-1">
        {isCompleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            className="rounded-lg p-1.5 text-subtext-0 transition-colors hover:bg-blue/15 hover:text-blue"
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
          className="rounded-lg p-1.5 text-subtext-0 transition-colors hover:bg-red/15 hover:text-red"
          title="Delete snapshot"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
