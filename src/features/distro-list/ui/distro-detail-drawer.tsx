import { Archive, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SnapshotList } from "@/features/snapshot-list/ui/snapshot-list";

interface DistroDetailDrawerProps {
  distroName: string;
  onRestore: (snapshotId: string, distroName: string) => void;
  onCreateSnapshot: () => void;
  onClose: () => void;
}

export function DistroDetailDrawer({
  distroName,
  onRestore,
  onCreateSnapshot,
  onClose,
}: DistroDetailDrawerProps) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel shadow-elevation-3 flex w-80 shrink-0 flex-col rounded-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-0 p-4">
        <div className="flex items-center gap-2">
          <Archive className="text-mauve h-5 w-5" />
          <h4 className="text-text text-sm font-semibold">{t("snapshots.title", { name: distroName })}</h4>
        </div>
        <button
          onClick={onClose}
          className="text-subtext-0 hover:text-text hover:bg-surface-0 rounded-lg p-1.5 transition-colors"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New Snapshot button */}
      <div className="p-3">
        <button
          onClick={onCreateSnapshot}
          className="bg-mauve/15 text-mauve hover:bg-mauve/25 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("snapshots.newSnapshot")}
        </button>
      </div>

      {/* Snapshot list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <SnapshotList distroName={distroName} onRestore={onRestore} hideDistroName />
      </div>
    </div>
  );
}
