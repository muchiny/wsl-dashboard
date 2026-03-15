import { useTranslation } from "react-i18next";
import { Play, Plus, Power, Loader2 } from "lucide-react";
import { useStartAll } from "../../api/mutations";
import type { Distro } from "@/shared/types/distro";

interface DistroBulkActionsProps {
  distros: Distro[] | undefined;
  running: number;
  stopped: number;
  total: number;
  onNewSnapshot: () => void;
  onShutdownAll: () => void;
  shutdownAllPending: boolean;
}

export function DistroBulkActions({
  distros,
  running,
  stopped,
  total,
  onNewSnapshot,
  onShutdownAll,
  shutdownAllPending,
}: DistroBulkActionsProps) {
  const { t } = useTranslation();
  const startAll = useStartAll();

  const stoppedNames = distros?.filter((d) => d.state === "Stopped").map((d) => d.name) ?? [];

  return (
    <div className="flex items-center gap-3">
      {/* Stats */}
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className="text-subtext-0">{t("distros.count", { count: total })}</span>
        <span className="text-overlay-0">·</span>
        <span className="text-green">{t("distros.running", { count: running })}</span>
        <span className="text-overlay-0">·</span>
        <span className="text-overlay-0">{t("distros.stopped", { count: stopped })}</span>
      </div>

      <div className="flex-1" />

      {/* Bulk actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => startAll.mutate(stoppedNames)}
          disabled={startAll.isPending || stoppedNames.length === 0}
          className="bg-green/20 text-green hover:bg-green/30 hover:neon-glow-green flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          data-testid="start-all"
        >
          {startAll.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {startAll.isPending ? t("distros.startAllPending") : t("distros.startAll")}
        </button>

        <button
          onClick={onNewSnapshot}
          className="bg-mauve/20 text-mauve hover:bg-mauve/30 hover:neon-glow-purple flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          data-testid="new-snapshot"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("distros.snapshot")}
        </button>

        <button
          onClick={onShutdownAll}
          disabled={shutdownAllPending || running === 0}
          className="bg-red/20 text-red hover:bg-red/30 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          data-testid="stop-all"
        >
          {shutdownAllPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
          {shutdownAllPending ? t("distros.stopAllPending") : t("distros.stopAll")}
        </button>
      </div>
    </div>
  );
}
