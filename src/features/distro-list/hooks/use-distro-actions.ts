import { useTranslation } from "react-i18next";
import { useCreateTerminalSession } from "@/features/terminal/api/mutations";
import type { Distro } from "@/shared/types/distro";

interface UseDistroActionsProps {
  distro: Distro;
  pendingAction?: string;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  onRestart: (name: string) => void;
  onSnapshot: (name: string) => void;
  onExpand: (name: string) => void;
}

export function useDistroActions({
  distro,
  pendingAction,
  onStart,
  onStop,
  onRestart,
  onSnapshot,
  onExpand,
}: UseDistroActionsProps) {
  const { t } = useTranslation();
  const createTerminalSession = useCreateTerminalSession();

  const isRunning = distro.state === "Running";
  const isPending = !!pendingAction;
  const stateLabel = t(`distros.state${distro.state}` as const);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onExpand(distro.name);
    }
  };

  const stopPropagation = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const handleStart = stopPropagation(() => onStart(distro.name));
  const handleStop = stopPropagation(() => onStop(distro.name));
  const handleRestart = stopPropagation(() => onRestart(distro.name));
  const handleSnapshot = stopPropagation(() => onSnapshot(distro.name));
  const handleTerminal = stopPropagation(() => createTerminalSession.mutate(distro.name));
  const handleMonitorClick = (e: React.MouseEvent) => e.stopPropagation();

  const ariaLabel = t(
    distro.is_default ? "distros.distroAriaLabelDefault" : "distros.distroAriaLabel",
    { name: distro.name, state: stateLabel },
  );

  return {
    t,
    isRunning,
    isPending,
    stateLabel,
    createTerminalSession,
    handleKeyDown,
    handleStart,
    handleStop,
    handleRestart,
    handleSnapshot,
    handleTerminal,
    handleMonitorClick,
    ariaLabel,
  };
}
