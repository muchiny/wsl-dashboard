import { useTranslation } from "react-i18next";
import { useCreateTerminalSession } from "@/features/terminal/api/mutations";
import type { Distro } from "@/shared/types/distro";

interface UseDistroActionsProps {
  distro: Distro;
  pendingAction?: string;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSnapshot: () => void;
  onExpand: () => void;
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
      onExpand();
    }
  };

  const stopPropagation = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const handleStart = stopPropagation(onStart);
  const handleStop = stopPropagation(onStop);
  const handleRestart = stopPropagation(onRestart);
  const handleSnapshot = stopPropagation(onSnapshot);
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
