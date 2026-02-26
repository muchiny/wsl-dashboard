import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { listen } from "@tauri-apps/api/event";
import { writeTerminal, resizeTerminal, closeTerminal } from "../api/mutations";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useTerminalStore } from "../model/use-terminal-store";

const CATPPUCCIN_MOCHA = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  cursor: "#f5e0dc",
  cursorAccent: "#1e1e2e",
  selectionBackground: "#585b70",
  selectionForeground: "#cdd6f4",
  black: "#45475a",
  red: "#f38ba8",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  blue: "#89b4fa",
  magenta: "#f5c2e7",
  cyan: "#94e2d5",
  white: "#bac2de",
  brightBlack: "#585b70",
  brightRed: "#f38ba8",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5",
  brightWhite: "#a6adc8",
};

const CATPPUCCIN_LATTE = {
  background: "#eff1f5",
  foreground: "#4c4f69",
  cursor: "#dc8a78",
  cursorAccent: "#eff1f5",
  selectionBackground: "#acb0be",
  selectionForeground: "#4c4f69",
  black: "#5c5f77",
  red: "#d20f39",
  green: "#40a02b",
  yellow: "#df8e1d",
  blue: "#1e66f5",
  magenta: "#ea76cb",
  cyan: "#179299",
  white: "#acb0be",
  brightBlack: "#6c6f85",
  brightRed: "#d20f39",
  brightGreen: "#40a02b",
  brightYellow: "#df8e1d",
  brightBlue: "#1e66f5",
  brightMagenta: "#ea76cb",
  brightCyan: "#179299",
  brightWhite: "#bcc0cc",
};

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
}

export function TerminalInstance({ sessionId, isActive }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const removeSession = useTerminalStore((s) => s.removeSession);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    const terminal = new Terminal({
      theme: theme === "dark" ? CATPPUCCIN_MOCHA : CATPPUCCIN_LATTE,
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

    // Listen for output from backend
    const outputUnlisten = listen<{ session_id: string; data: number[] }>(
      "terminal-output",
      (event) => {
        if (event.payload.session_id === sessionId) {
          const bytes = new Uint8Array(event.payload.data);
          terminal.write(bytes);
        }
      },
    );

    // Listen for session exit
    const exitUnlisten = listen<{ session_id: string }>("terminal-exit", (event) => {
      if (event.payload.session_id === sessionId) {
        terminal.write("\r\n\x1b[90m[Session ended]\x1b[0m\r\n");
        removeSession(sessionId);
      }
    });

    // Resize observer for container changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        resizeTerminal(sessionId, terminal.cols, terminal.rows).catch(() => {});
      });
    });
    resizeObserver.observe(container);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    return () => {
      inputDispose.dispose();
      outputUnlisten.then((fn) => fn());
      exitUnlisten.then((fn) => fn());
      resizeObserver.disconnect();
      terminal.dispose();
      closeTerminal(sessionId).catch(() => {});
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update theme when it changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = theme === "dark" ? CATPPUCCIN_MOCHA : CATPPUCCIN_LATTE;
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
