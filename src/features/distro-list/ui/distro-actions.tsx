import { Play, Square, RotateCw, Archive, Activity, TerminalSquare, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ActionIconButton } from "@/shared/ui/action-icon-button";
import { Tooltip } from "@/shared/ui/tooltip";
import type { useDistroActions } from "../hooks/use-distro-actions";

type DistroActionsProps = Pick<
  ReturnType<typeof useDistroActions>,
  | "t"
  | "isRunning"
  | "isPending"
  | "createTerminalSession"
  | "handleStart"
  | "handleStop"
  | "handleRestart"
  | "handleSnapshot"
  | "handleDelete"
  | "handleTerminal"
  | "handleMonitorClick"
> & {
  distroName: string;
  pendingAction?: string;
};

export function DistroActions({
  t,
  isRunning,
  isPending,
  createTerminalSession,
  handleStart,
  handleStop,
  handleRestart,
  handleSnapshot,
  handleDelete,
  handleTerminal,
  handleMonitorClick,
  distroName,
  pendingAction,
}: DistroActionsProps) {
  return (
    <>
      <div className="flex gap-1">
        {!isRunning && (
          <Tooltip
            content={
              pendingAction === "Starting" ? t("distros.pendingStarting") : t("distros.tipStart")
            }
          >
            <ActionIconButton
              icon={Play}
              loading={pendingAction === "Starting"}
              disabled={isPending}
              onClick={handleStart}
              className="bg-green/15 text-green hover:bg-green/25"
              aria-label={t("distros.startAction", { name: distroName })}
            />
          </Tooltip>
        )}
        {isRunning && (
          <>
            <Tooltip
              content={
                pendingAction === "Restarting"
                  ? t("distros.pendingRestarting")
                  : t("distros.tipRestart")
              }
            >
              <ActionIconButton
                icon={RotateCw}
                loading={pendingAction === "Restarting"}
                disabled={isPending}
                onClick={handleRestart}
                className="bg-yellow/15 text-yellow hover:bg-yellow/25"
                aria-label={t("distros.restartAction", { name: distroName })}
              />
            </Tooltip>
            <Tooltip
              content={
                pendingAction === "Stopping" ? t("distros.pendingStopping") : t("distros.tipStop")
              }
            >
              <ActionIconButton
                icon={Square}
                loading={pendingAction === "Stopping"}
                disabled={isPending}
                onClick={handleStop}
                className="bg-red/15 text-red hover:bg-red/25"
                aria-label={t("distros.stopAction", { name: distroName })}
              />
            </Tooltip>
          </>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <Tooltip content={t("distros.tipSnapshot")}>
          <ActionIconButton
            icon={Archive}
            disabled={isPending}
            onClick={handleSnapshot}
            className="bg-mauve/15 text-mauve hover:bg-mauve/25"
            aria-label={t("distros.createSnapshotOf", { name: distroName })}
          />
        </Tooltip>
        {isRunning && (
          <Tooltip content={t("distros.tipTerminal")}>
            <ActionIconButton
              icon={TerminalSquare}
              loading={createTerminalSession.isPending}
              disabled={isPending}
              onClick={handleTerminal}
              className="bg-teal/15 text-teal hover:bg-teal/25"
              aria-label={t("distros.openTerminalIn", { name: distroName })}
            />
          </Tooltip>
        )}
        {isRunning && (
          <Tooltip content={t("distros.tipMonitor")}>
            <Link
              to="/monitoring"
              search={{ distro: distroName }}
              onClick={handleMonitorClick}
              className="bg-sapphire/15 text-sapphire hover:bg-sapphire/25 rounded-lg p-1.5 transition-colors"
              aria-label={t("distros.monitorAction", { name: distroName })}
            >
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Tooltip>
        )}
        <Tooltip content={t("distros.tipDelete")}>
          <ActionIconButton
            icon={Trash2}
            disabled={isPending}
            onClick={handleDelete}
            className="bg-red/15 text-red hover:bg-red/25"
            aria-label={t("distros.deleteAction", { name: distroName })}
          />
        </Tooltip>
      </div>
    </>
  );
}
