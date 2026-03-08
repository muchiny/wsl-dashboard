import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { listen } from "@tauri-apps/api/event";
import { writeTerminal, resizeTerminal, isTerminalAlive } from "../api/mutations";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useTerminalStore } from "../model/use-terminal-store";

const NEON_DARK = {
  background: "#0a0a1a",
  foreground: "#e2e8f0",
  cursor: "#00f0ff",
  cursorAccent: "#0a0a1a",
  selectionBackground: "rgba(0,240,255,0.2)",
  selectionForeground: "#ffffff",
  black: "#1e1e3d",
  red: "#ff2d55",
  green: "#30d158",
  yellow: "#ffd60a",
  blue: "#0a84ff",
  magenta: "#bf5af2",
  cyan: "#00f0ff",
  white: "#b0b0d0",
  brightBlack: "#2a2a50",
  brightRed: "#ff375f",
  brightGreen: "#32d74b",
  brightYellow: "#ffd426",
  brightBlue: "#409cff",
  brightMagenta: "#da8fff",
  brightCyan: "#70d7ff",
  brightWhite: "#e2e8f0",
};

const FROSTED_LIGHT = {
  background: "#f0f0f5",
  foreground: "#1a1a2e",
  cursor: "#0891b2",
  cursorAccent: "#f0f0f5",
  selectionBackground: "rgba(37,99,235,0.2)",
  selectionForeground: "#1a1a2e",
  black: "#d0d0dd",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#ca8a04",
  blue: "#2563eb",
  magenta: "#7c3aed",
  cyan: "#0891b2",
  white: "#4a4a65",
  brightBlack: "#b0b0c0",
  brightRed: "#ef4444",
  brightGreen: "#22c55e",
  brightYellow: "#eab308",
  brightBlue: "#3b82f6",
  brightMagenta: "#8b5cf6",
  brightCyan: "#06b6d4",
  brightWhite: "#1a1a2e",
};

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
}

export function TerminalInstance({ sessionId, isActive }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isActiveRef = useRef(isActive);
  const theme = useThemeStore((s) => s.theme);
  const removeSession = useTerminalStore((s) => s.removeSession);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    // Buffer PTY output arriving before xterm is ready
    let pendingData: Uint8Array[] = [];

    // Register event listeners IMMEDIATELY to avoid missing initial output
    // (shell prompt, MOTD) that the PTY sends before xterm is created.
    const outputUnlisten = listen<{ session_id: string; data: number[] }>(
      "terminal-output",
      (event) => {
        if (event.payload.session_id === sessionId) {
          const bytes = new Uint8Array(event.payload.data);
          if (terminalRef.current) {
            terminalRef.current.write(bytes);
          } else {
            pendingData.push(bytes);
          }
        }
      },
    );

    const exitUnlisten = listen<{ session_id: string }>("terminal-exit", (event) => {
      if (event.payload.session_id === sessionId) {
        terminalRef.current?.write("\r\n\x1b[90m[Session ended]\x1b[0m\r\n");
        removeSession(sessionId);
      }
    });

    const setup = async () => {
      // Check if the backend session is still alive before creating xterm.
      // On error (e.g. HMR reload losing callback), assume alive and proceed
      // rather than incorrectly removing a valid session.
      const alive = await isTerminalAlive(sessionId).catch(() => true);
      if (!alive) {
        removeSession(sessionId);
        return;
      }
      if (cancelled) return;

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      const terminal = new Terminal({
        theme: theme === "dark" ? NEON_DARK : FROSTED_LIGHT,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 5000,
        allowProposedApi: true,
      });

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.open(container);

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Flush any buffered output that arrived before xterm was ready
      for (const data of pendingData) {
        terminal.write(data);
      }
      pendingData = [];

      // Initial fit
      requestAnimationFrame(() => {
        fitAddon.fit();
        resizeTerminal(sessionId, terminal.cols, terminal.rows).catch(() => {});
      });

      // Send user input to backend
      const inputDispose = terminal.onData((data) => {
        const encoder = new TextEncoder();
        writeTerminal(sessionId, encoder.encode(data)).catch(() => {});
      });

      // Resize observer for container changes
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          fitAddon.fit();
          resizeTerminal(sessionId, terminal.cols, terminal.rows).catch(() => {});
        });
      });
      resizeObserver.observe(container);

      // Refit terminal when window is restored from minimize
      const handleVisibilityChange = () => {
        if (!document.hidden && isActiveRef.current) {
          requestAnimationFrame(() => {
            fitAddon.fit();
            terminal.refresh(0, terminal.rows - 1);
          });
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Store cleanup for xterm-specific resources
      cleanupRef.current = () => {
        inputDispose.dispose();
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        terminal.dispose();
      };
    };

    setup();

    return () => {
      cancelled = true;
      // Clean up Tauri event listeners (registered immediately, not in setup)
      outputUnlisten.then((fn) => fn());
      exitUnlisten.then((fn) => fn());
      // Clean up xterm and related resources
      cleanupRef.current?.();
      cleanupRef.current = null;
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update theme when it changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = theme === "dark" ? NEON_DARK : FROSTED_LIGHT;
    }
  }, [theme]);

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive && terminalRef.current) {
      terminalRef.current.focus();
      fitAddonRef.current?.fit();
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? "block" : "none" }}
    />
  );
}
