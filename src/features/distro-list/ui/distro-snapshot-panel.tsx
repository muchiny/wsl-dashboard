import { Archive, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SnapshotList } from "@/features/snapshot-list/ui/snapshot-list";

interface DistroSnapshotPanelProps {
  distroName: string;
  onRestore: (snapshotId: string, distroName: string) => void;
  onCreateSnapshot: () => void;
  onClose: () => void;
}

export function DistroSnapshotPanel({
  distroName,
  onRestore,
  onCreateSnapshot,
  onClose,
}: DistroSnapshotPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="glass-card-lite border-mauve/30 expand-down rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">{t("snapshots.title", { name: distroName })}</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateSnapshot}
            className="bg-mauve/15 text-mauve hover:bg-mauve/25 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("snapshots.newSnapshot")}
          </button>
          <button
            onClick={onClose}
            className="text-subtext-0 hover:text-text hover:bg-surface-0 rounded-lg p-1.5 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <SnapshotList distroName={distroName} onRestore={onRestore} hideDistroName />
    </div>
  );
}
