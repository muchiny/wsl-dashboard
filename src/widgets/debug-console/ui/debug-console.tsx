import { useEffect, useRef } from "react";
import { Terminal, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  useDebugConsoleStore,
  type LogFilter,
  type LogLevel,
} from "@/shared/hooks/use-debug-console";
import { cn } from "@/shared/lib/utils";

const LEVEL_FILTERS: { label: string; value: LogFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Error", value: "ERROR" },
  { label: "Warn", value: "WARN" },
  { label: "Info", value: "INFO" },
  { label: "Debug", value: "DEBUG" },
];

const LEVEL_COLORS: Record<LogLevel, string> = {
  ERROR: "bg-red/15 text-red",
  WARN: "bg-peach/15 text-peach",
  INFO: "bg-blue/15 text-blue",
  DEBUG: "bg-green/15 text-green",
  TRACE: "bg-overlay-1/15 text-overlay-1",
};

export function DebugConsole() {
  const { isOpen, logs, filter, toggle, setFilter, clear } = useDebugConsoleStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = filter === "ALL" ? logs : logs.filter((l) => l.level === filter);

  const errorCount = logs.filter((l) => l.level === "ERROR").length;
  const warnCount = logs.filter((l) => l.level === "WARN").length;

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, isOpen]);

  return (
    <div className="border-surface-1 flex shrink-0 flex-col border-t">
      {/* Toggle bar — always visible */}
      <button
        onClick={toggle}
        className="bg-mantle hover:bg-surface-0 flex h-8 items-center justify-between px-4 text-xs transition-colors"
      >
        <div className="text-subtext-0 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          <span className="font-medium">Debug Console</span>
          {errorCount > 0 && (
            <span className="bg-red/15 text-red rounded-full px-1.5 py-0.5 font-mono">
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="bg-peach/15 text-peach rounded-full px-1.5 py-0.5 font-mono">
              {warnCount}
            </span>
          )}
        </div>
        <div className="text-subtext-0 flex items-center gap-1">
          <span className="text-overlay-1 font-mono">{logs.length} entries</span>
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expandable panel */}
      {isOpen && (
        <div className="bg-crust flex h-[40vh] flex-col">
          {/* Toolbar */}
          <div className="border-surface-1 flex items-center justify-between border-b px-3 py-1.5">
            {/* Level filters */}
            <div className="flex items-center gap-1">
              {LEVEL_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                    filter === f.value
                      ? "bg-blue/15 text-blue"
                      : "text-subtext-0 hover:bg-surface-0 hover:text-text",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={clear}
                className="text-subtext-0 hover:bg-surface-0 hover:text-text rounded p-1 transition-colors"
                title="Clear logs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={toggle}
                className="text-subtext-0 hover:bg-surface-0 hover:text-text rounded p-1 transition-colors"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div ref={scrollRef} className="flex-1 overflow-auto font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-overlay-0 flex h-full items-center justify-center">
                No log entries
              </div>
            ) : (
              <table className="w-full">
                <tbody>
                  {filteredLogs.map((entry) => (
                    <tr
                      key={entry.id}
                      className={cn(
                        "border-surface-0/50 hover:bg-surface-0/30 border-b",
                        entry.level === "ERROR" && "bg-red/5",
                      )}
                    >
                      <td className="text-overlay-1 px-2 py-0.5 whitespace-nowrap">
                        {entry.timestamp}
                      </td>
                      <td className="px-1 py-0.5">
                        <span
                          className={cn(
                            "inline-block w-14 rounded px-1 py-0.5 text-center text-[10px] font-semibold",
                            LEVEL_COLORS[entry.level] ?? LEVEL_COLORS.TRACE,
                          )}
                        >
                          {entry.level}
                        </span>
                      </td>
                      <td className="text-mauve px-2 py-0.5 whitespace-nowrap">
                        {entry.target.split("::").pop()}
                      </td>
                      <td className="text-text w-full px-2 py-0.5 break-all">{entry.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
