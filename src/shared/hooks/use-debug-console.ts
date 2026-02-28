import { useEffect, useRef } from "react";
import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { onIpcTiming, tauriInvoke } from "@/shared/api/tauri-client";

// ── Types ──

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
  target: string;
}

export type LogFilter = LogLevel | "ALL";

// ── Store ──

interface DebugConsoleState {
  isOpen: boolean;
  logs: LogEntry[];
  filter: LogFilter;
  toggle: () => void;
  setFilter: (filter: LogFilter) => void;
  addLog: (entry: LogEntry) => void;
  setLogs: (entries: LogEntry[]) => void;
  clear: () => void;
}

const MAX_LOGS = 1000;

export const useDebugConsoleStore = create<DebugConsoleState>((set) => ({
  isOpen: false,
  logs: [],
  filter: "ALL",
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setFilter: (filter) => set({ filter }),
  addLog: (entry) =>
    set((s) => {
      const next = [...s.logs, entry];
      if (next.length > MAX_LOGS) next.shift();
      return { logs: next };
    }),
  setLogs: (entries) => set({ logs: entries }),
  clear: () => {
    tauriInvoke("clear_debug_logs").catch(() => {});
    set({ logs: [] });
  },
}));

// ── Setup hook (call once at app root) ──

let jsIdCounter = 100_000;

function createJsEntry(level: LogLevel, message: string, target = "frontend"): LogEntry {
  return {
    id: jsIdCounter++,
    timestamp: new Date().toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions),
    level,
    message,
    target,
  };
}

export function useDebugConsoleSetup() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const { addLog, setLogs } = useDebugConsoleStore.getState();

    // 1. Fetch existing backend logs
    tauriInvoke<LogEntry[]>("get_debug_logs")
      .then((entries) => setLogs(entries))
      .catch(() => {});

    // 2. Listen for real-time backend log events
    const unlistenPromise = listen<LogEntry>("debug-log-entry", (event) => {
      useDebugConsoleStore.getState().addLog(event.payload);
    });

    // 3. Intercept console.error & console.warn
    const origError = console.error;
    const origWarn = console.warn;

    console.error = (...args: unknown[]) => {
      origError(...args);
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      addLog(createJsEntry("ERROR", msg));
    };

    console.warn = (...args: unknown[]) => {
      origWarn(...args);
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      // Filter out known noisy warnings
      if (
        msg.includes("should be greater than 0") || // Recharts ResponsiveContainer init
        msg.includes("RedrawEventsCleared") // Tauri/wry internal
      ) {
        return;
      }
      addLog(createJsEntry("WARN", msg));
    };

    // 4. Catch unhandled promise rejections
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
      useDebugConsoleStore.getState().addLog(createJsEntry("ERROR", `Unhandled: ${msg}`));
    };
    window.addEventListener("unhandledrejection", onRejection);

    // 5. Catch global errors
    const onError = (event: ErrorEvent) => {
      useDebugConsoleStore
        .getState()
        .addLog(createJsEntry("ERROR", `${event.message} (${event.filename}:${event.lineno})`));
    };
    window.addEventListener("error", onError);

    // 6. Keyboard shortcut: Ctrl+Shift+D
    const onKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        useDebugConsoleStore.getState().toggle();
      }
    };
    window.addEventListener("keydown", onKeydown);

    // 7. IPC timing (dev only) — shows command round-trip durations
    if (import.meta.env.DEV) {
      onIpcTiming((cmd, durationMs, ok) => {
        useDebugConsoleStore
          .getState()
          .addLog(
            createJsEntry(
              ok ? "DEBUG" : "WARN",
              `IPC ${cmd} ${ok ? "OK" : "FAIL"} (${durationMs.toFixed(1)}ms)`,
              "ipc",
            ),
          );
      });
    }

    return () => {
      // Restore originals
      console.error = origError;
      console.warn = origWarn;
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
      window.removeEventListener("keydown", onKeydown);
      unlistenPromise.then((fn) => fn());
    };
  }, []);
}
