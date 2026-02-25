# 🔧 Shared

> Cross-cutting layer — Tauri API, hooks, TypeScript types, utilities and shared UI components.

---

## 🎯 Purpose

The `shared/` layer contains everything used by **multiple features and pages**. It is the lowest layer in the frontend — it imports from no other application layer.

---

## 📁 Structure

```
shared/
├── 🔗 api/               # Tauri backend communication
│   ├── tauri-client.ts   # tauriInvoke<T>() — typed wrapper
│   └── events.ts         # EVENTS constants
├── ⚙️ config/            # Global configuration
│   └── query-client.ts   # QueryClient (TanStack Query)
├── 🪝 hooks/             # Reusable React hooks
│   ├── use-debug-console.ts  # Zustand store for debug console panel
│   ├── use-tauri-event.ts    # Tauri event listener
│   └── use-theme.ts          # Zustand theme store
├── 📚 lib/               # Utilities
│   ├── utils.ts          # cn() — Tailwind class merging
│   └── formatters.ts     # Bytes, percent, relative time formatting
├── 📝 types/             # TypeScript interfaces
│   ├── distro.ts         # Distro, DistroState
│   ├── snapshot.ts       # Snapshot, CreateSnapshotArgs, RestoreSnapshotArgs
│   └── monitoring.ts     # SystemMetrics, CpuMetrics, MemoryMetrics, DiskMetrics, NetworkMetrics
└── 🎨 ui/               # Shared UI components
    └── error-boundary.tsx # React Error Boundary with retry
```

---

## 🔗 `api/` — Tauri Communication

### `tauri-client.ts`

```typescript
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>
```

- Typed wrapper around `@tauri-apps/api/core.invoke()`
- Converts errors to `TauriError` with explicit messages
- **Used by**: all `useQuery` and `useMutation` hooks in features

### `events.ts`

```typescript
const EVENTS = {
  DISTRO_STATE_CHANGED: "distro-state-changed",
}
```

Single event constant for distro state change notifications.

---

## ⚙️ `config/` — TanStack Query Configuration

### `query-client.ts`

| Setting | Value | Why |
|---|---|---|
| `staleTime` | 5,000 ms | Avoids excessive refetching |
| `retry` | 1 | Single retry attempt |
| `refetchOnWindowFocus` | `false` | No refetch on window focus (desktop app) |

---

## 🪝 `hooks/` — React Hooks

### `useDebugConsoleStore()`

Zustand store managing the in-app debug console panel:

| Property | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Panel visibility |
| `logs` | `LogEntry[]` | Log entries (max 1000) |
| `filter` | `LogFilter` | Active level filter (`"ALL"` or a specific `LogLevel`) |
| `toggle()` | `() => void` | Toggle panel open/closed |
| `setFilter()` | `(filter) => void` | Change level filter |
| `addLog()` | `(entry) => void` | Append a log entry |
| `setLogs()` | `(entries) => void` | Replace all log entries |
| `clear()` | `() => void` | Clear logs (also calls `clear_debug_logs` backend command) |

Also exports `useDebugConsoleSetup()` — a one-time setup hook (called at app root) that:
- Fetches existing backend logs via `get_debug_logs`
- Listens for real-time `debug-log-entry` Tauri events
- Intercepts `console.error` and `console.warn`
- Catches unhandled promise rejections and global errors
- Registers **Ctrl+Shift+D** keyboard shortcut

### `useTauriEvent<T>(event, handler)`

Generic hook for listening to Tauri events:
- Setup in `useEffect` with automatic cleanup
- Accepts a typed callback `(payload: T) => void`
- **Used by**: `distro-events`, monitoring pages

### `useThemeStore()`

Zustand store with localStorage persistence:

| Property | Type | Description |
|---|---|---|
| `theme` | `"dark" \| "light"` | Current theme |
| `toggleTheme()` | `() => void` | Toggle dark/light |

- **localStorage key**: `wsl-nexus-theme`
- **Used by**: Header (Sun/Moon toggle)

Also exports `useThemeSync()` — keeps the DOM `data-theme` attribute in sync (call once at app root).

---

## 📚 `lib/` — Utilities

### `utils.ts`

```typescript
function cn(...inputs: ClassValue[]): string
```
Combines `clsx` (conditional classes) + `tailwind-merge` (Tailwind conflict resolution).

### `formatters.ts`

| Function | Input | Output | Example |
|---|---|---|---|
| `formatBytes(bytes)` | `number` | `string` | `formatBytes(1536000)` → `"1.46 MB"` |
| `formatPercent(value)` | `number` | `string` | `formatPercent(85.3)` → `"85.3%"` |
| `formatRelativeTime(iso)` | `string` (ISO) | `string` | `formatRelativeTime("2024-01-01T...")` → `"2d ago"` |

---

## 📝 `types/` — TypeScript Interfaces

### `distro.ts`

| Type | Key Fields |
|---|---|
| `Distro` | name, state, wsl_version, is_default, base_path, vhdx_size_bytes, last_seen |
| `DistroState` | `"Running" \| "Stopped" \| "Installing" \| "Converting" \| "Uninstalling"` |

### `snapshot.ts`

| Type | Key Fields |
|---|---|
| `Snapshot` | id, distro_name, name, snapshot_type, format, file_path, file_size_bytes, status |
| `CreateSnapshotArgs` | distro_name, name, description, format, output_dir |
| `RestoreSnapshotArgs` | snapshot_id, mode, new_name, install_location |

### `monitoring.ts`

| Type | Contents |
|---|---|
| `SystemMetrics` | cpu, memory, disk, network (aggregate) |
| `CpuMetrics` | usage_percent, per_core, load_average |
| `MemoryMetrics` | total, used, available, cached, swap_total, swap_used |
| `DiskMetrics` | total, used, available, usage_percent |
| `NetworkMetrics` | interfaces[] (name, rx_bytes, tx_bytes, rx_packets, tx_packets) |
| `ProcessInfo` | pid, user, cpu_percent, mem_percent, vsz, rss, command, state |

---

## 🎨 `ui/` — Shared Components

### `error-boundary.tsx`

React Error Boundary (class component) with:
- `AlertTriangle` icon from Lucide
- Error message display
- **"Try Again"** button that resets the error state
- Fallback UI styled with the Tailwind theme

---

> 📖 See also: [🧩 Features](../features/README.md) · [📄 Pages](../pages/README.md) · [🧱 Widgets](../widgets/README.md)
