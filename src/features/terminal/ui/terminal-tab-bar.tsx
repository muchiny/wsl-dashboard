import { useTranslation } from "react-i18next";
import { X, Plus } from "lucide-react";
import { useTerminalStore, type TerminalSession } from "../model/use-terminal-store";
import { cn } from "@/shared/lib/utils";

interface TerminalTabBarProps {
  onNewTerminal: () => void;
}

export function TerminalTabBar({ onNewTerminal }: TerminalTabBarProps) {
  const { t } = useTranslation();
  const { sessions, activeSessionId, setActiveSession, removeSession } = useTerminalStore();

  return (
    <div className="bg-crust flex items-center gap-0.5 overflow-x-auto px-2">
      {sessions.map((session) => (
        <TerminalTab
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onSelect={() => setActiveSession(session.id)}
          onClose={() => removeSession(session.id)}
        />
      ))}
      <button
        onClick={onNewTerminal}
        className="text-subtext-0 hover:bg-surface-0 hover:text-text ml-1 flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors"
        aria-label={t("terminal.newTerminal")}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TerminalTab({
  session,
  isActive,
  onSelect,
  onClose,
}: {
  session: TerminalSession;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="tab"
      aria-selected={isActive}
      className={cn(
        "group flex max-w-[200px] items-center gap-1.5 rounded-t px-3 py-1.5 text-xs transition-colors",
        isActive ? "bg-mantle text-text" : "text-subtext-0 hover:bg-surface-0 hover:text-text",
      )}
    >
      <button onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {session.title}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="text-overlay-0 hover:text-red shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={t("terminal.closeTab", { title: session.title })}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
