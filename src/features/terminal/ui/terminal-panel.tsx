import { useCallback, useRef } from "react";
import { ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { useTerminalStore } from "../model/use-terminal-store";
import { TerminalTabBar } from "./terminal-tab-bar";
import { TerminalInstance } from "./terminal-instance";
import { createTerminal } from "../api/mutations";
import { useDistros } from "@/features/distro-list/api/queries";
import { cn } from "@/shared/lib/utils";

export function TerminalPanel() {
  const { sessions, activeSessionId, isOpen, panelHeight, closePanel, setPanelHeight } =
    useTerminalStore();
  const addSession = useTerminalStore((s) => s.addSession);
  const { data: distros } = useDistros();
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleNewTerminal = useCallback(async () => {
    // Pick the first running distro, or prompt if multiple
    const running = distros?.filter((d) => d.state === "Running") ?? [];
    const target = running[0];
    if (!target) return;

    try {
      const sessionId = await createTerminal(target.name);
      addSession({
        id: sessionId,
        distroName: target.name,
        title: target.name,
      });
    } catch (err) {
      console.error("Failed to create terminal:", err);
    }
  }, [distros, addSession]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startHeight: panelHeight };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        setPanelHeight(dragRef.current.startHeight + delta);
      };

      const onMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [panelHeight, setPanelHeight],
  );

  if (sessions.length === 0) return null;

  return (
    <div
      className={cn("border-surface-1 bg-base flex flex-col border-t", !isOpen && "h-8")}
      style={isOpen ? { height: panelHeight } : undefined}
    >
      {/* Resize handle */}
      {isOpen && (
        <div
          className="hover:bg-blue/50 h-1 cursor-ns-resize transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Tab bar + controls */}
      <div className="flex items-center justify-between pr-2">
        <TerminalTabBar onNewTerminal={handleNewTerminal} />
        <div className="flex items-center gap-1">
          <button
            onClick={() => (isOpen ? closePanel() : useTerminalStore.getState().openPanel())}
            className="text-subtext-0 hover:text-text rounded p-1 transition-colors"
            aria-label={isOpen ? "Minimize terminal" : "Expand terminal"}
          >
            {isOpen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={closePanel}
            className="text-subtext-0 hover:text-text rounded p-1 transition-colors"
            aria-label="Hide terminal"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal instances */}
      {isOpen && (
        <div className="min-h-0 flex-1">
          {sessions.map((session) => (
            <TerminalInstance
              key={session.id}
              sessionId={session.id}
              isActive={session.id === activeSessionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
