import { Play, Square, RotateCw, Archive, Activity, TerminalSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ActionIconButton } from "@/shared/ui/action-icon-button";
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
  handleTerminal,
  handleMonitorClick,
  distroName,
  pendingAction,
}: DistroActionsProps) {
  return (
    <>
      <div className="flex gap-1">
        {!isRunning && (
          <ActionIconButton
            icon={Play}
            loading={pendingAction === "Starting"}
            disabled={isPending}
            onClick={handleStart}
            className="text-subtext-0 hover:bg-green/20 hover:text-green"
            aria-label={t("distros.startAction", { name: distroName })}
            title={t("distros.startAction", { name: distroName })}
          />
        )}
        {isRunning && (
          <>
            <ActionIconButton
              icon={RotateCw}
              loading={pendingAction === "Restarting"}
              disabled={isPending}
              onClick={handleRestart}
              className="text-subtext-0 hover:bg-yellow/20 hover:text-yellow"
              aria-label={t("distros.restartAction", { name: distroName })}
              title={t("distros.restartAction", { name: distroName })}
            />
            <ActionIconButton
              icon={Square}
              loading={pendingAction === "Stopping"}
              disabled={isPending}
              onClick={handleStop}
              className="text-subtext-0 hover:bg-red/20 hover:text-red"
              aria-label={t("distros.stopAction", { name: distroName })}
              title={t("distros.stopAction", { name: distroName })}
            />
          </>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <ActionIconButton
          icon={Archive}
          disabled={isPending}
          onClick={handleSnapshot}
          className="text-subtext-0 hover:bg-mauve/20 hover:text-mauve"
          aria-label={t("distros.createSnapshotOf", { name: distroName })}
          title={t("distros.createSnapshotOf", { name: distroName })}
        />
        {isRunning && (
          <ActionIconButton
            icon={TerminalSquare}
            loading={createTerminalSession.isPending}
            disabled={isPending}
            onClick={handleTerminal}
            className="text-subtext-0 hover:bg-teal/20 hover:text-teal"
            aria-label={t("distros.openTerminalIn", { name: distroName })}
            title={t("distros.openTerminalIn", { name: distroName })}
          />
        )}
        {isRunning && (
          <Link
            to="/monitoring"
            search={{ distro: distroName }}
            onClick={handleMonitorClick}
            className="text-subtext-0 hover:bg-sapphire/20 hover:text-sapphire rounded-lg p-1.5 transition-colors"
            aria-label={t("distros.monitorAction", { name: distroName })}
            title={t("distros.monitorAction", { name: distroName })}
          >
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </>
  );
}
