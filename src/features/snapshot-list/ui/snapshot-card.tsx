import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, RotateCw, Archive, Clock, HardDrive, Loader2 } from "lucide-react";
import type { Snapshot } from "@/shared/types/snapshot";
import { formatBytes, formatRelativeTime } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";

interface SnapshotCardProps {
  snapshot: Snapshot;
  onDelete: () => void;
  onRestore: () => void;
  hideDistroName?: boolean;
}

export const SnapshotCard = memo(function SnapshotCard({
  snapshot,
  onDelete,
  onRestore,
  hideDistroName,
}: SnapshotCardProps) {
  const { t } = useTranslation();
  const isCompleted = snapshot.status === "completed";
  const isInProgress = snapshot.status === "in_progress";
  const isFailed = snapshot.status.startsWith("failed");

  return (
    <div className="border-surface-1 bg-base hover:border-mauve/40 rounded-xl border p-4 transition-all">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isInProgress ? (
              <Loader2 className="text-yellow h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Archive className="text-mauve h-4 w-4 shrink-0" />
            )}
            <h4 className="text-text truncate font-semibold">{snapshot.name}</h4>
          </div>
          {snapshot.description && (
            <p className="text-subtext-0 mt-1 line-clamp-2 text-sm">{snapshot.description}</p>
          )}
        </div>
        <span
          className={cn(
            "ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isCompleted && "bg-green/25 text-green",
            isInProgress && "bg-yellow/25 text-yellow animate-pulse",
            isFailed && "bg-red/25 text-red",
          )}
        >
          {isCompleted
            ? t("snapshots.completed")
            : isInProgress
              ? t("snapshots.exporting")
              : t("snapshots.failed")}
        </span>
      </div>

      <div className="text-subtext-0 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {!hideDistroName && (
          <span className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {snapshot.distro_name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(snapshot.created_at)}
        </span>
        {snapshot.file_size_bytes > 0 && <span>{formatBytes(snapshot.file_size_bytes)}</span>}
        <span className="bg-surface-0 rounded-md px-1.5 py-0.5">{snapshot.format}</span>
        <span className="bg-surface-0 rounded-md px-1.5 py-0.5">{snapshot.snapshot_type}</span>
      </div>

      <div className="mt-3 flex justify-end gap-1">
        {isCompleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            className="text-subtext-0 hover:bg-blue/20 hover:text-blue rounded-lg p-1.5 transition-colors"
            title={t("snapshots.restoreSnapshot")}
            aria-label={t("snapshots.restoreSnapshot")}
            data-testid="snapshot-restore"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-subtext-0 hover:bg-red/20 hover:text-red rounded-lg p-1.5 transition-colors"
          title={t("snapshots.deleteSnapshot")}
          aria-label={t("snapshots.deleteSnapshot")}
          data-testid="snapshot-delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
