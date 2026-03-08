# 🪝 Hooks

> Reusable React hooks for theme management, event handling, debouncing, and debug tooling.

---

## 📋 Hook Reference

| Hook | Purpose | Parameters | Returns |
|------|---------|------------|---------|
| `useThemeStore` | Zustand store for dark/light theme. Persists to `localStorage` key `wsl-nexus-theme`. | — | `{ theme, toggleTheme }` |
| `useThemeSync` | Keeps the DOM `data-theme` attribute in sync with the theme store. Call once at app root. | — | `void` |
| `useDebounce<T>` | Debounces a value by a given delay (ms). | `value: T`, `delay: number` | `T` (debounced) |
| `useTauriEvent<T>` | Subscribes to a Tauri backend event. Automatically cleans up the listener on unmount. Uses a stable ref for the handler to avoid re-subscriptions. | `event: string`, `handler: (payload: T) => void` | `void` |
| `useDebugConsoleStore` | Zustand store for the debug console: log entries, filter, open/closed state. Caps at 1,000 entries. | — | `{ isOpen, logs, filter, toggle, setFilter, addLog, setLogs, clear }` |
| `useDebugConsoleSetup` | Initializes the debug console: fetches existing backend logs, listens for real-time `debug-log-entry` events, intercepts `console.error`/`console.warn`, catches unhandled rejections and global errors, registers `Ctrl+Shift+D` toggle shortcut, and enables IPC timing in dev mode. Call once at app root. | — | `void` |

## 📂 Files

| File | Exports |
|------|---------|
| `use-theme.ts` | `useThemeStore`, `useThemeSync` |
| `use-debounce.ts` | `useDebounce` |
| `use-tauri-event.ts` | `useTauriEvent` |
| `use-debug-console.ts` | `LogLevel`, `LogEntry`, `LogFilter`, `useDebugConsoleStore`, `useDebugConsoleSetup` |

---

> 👀 See also: [shared/](../README.md) · [api/](../api/README.md) · [stores/](../stores/README.md) · [ui/](../ui/README.md)
