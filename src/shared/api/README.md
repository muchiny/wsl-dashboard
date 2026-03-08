# 🔌 API Layer

> Typed Tauri IPC client and React Query integration for frontend-to-backend communication.

---

## 🔄 Data Flow

```mermaid
graph LR
    A[React Component] --> B[useQuery / useMutation]
    B --> C[tauriClient.invoke]
    C --> D[Tauri IPC]
    D --> E[Rust Backend]
```

## 📂 Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `tauri-client.ts` | Typed wrapper around `@tauri-apps/api/core` `invoke()`. Adds IPC timing instrumentation (dev only) and unified error handling. | `tauriInvoke<T>(cmd, args?)`, `onIpcTiming(callback)` |
| `distro-queries.ts` | TanStack Query hook for fetching WSL distributions. Auto-refreshes every 10 seconds. | `useDistros()`, `distroKeys` |
| `use-tauri-mutation.ts` | Generic mutation wrapper that handles query invalidation and toast notifications on success/error. | `useTauriMutation<TData, TVariables>(options)` |

## 🔑 Key Details

- **Error normalization** — `tauriInvoke` catches Tauri errors (which arrive as plain strings) and wraps them in `Error` objects.
- **IPC timing** — In development, a callback registered via `onIpcTiming()` receives command name, duration in ms, and success/failure status. Used by the Debug Console.
- **Query keys** — `distroKeys` follows the TanStack Query factory pattern (`distroKeys.all`, `distroKeys.list()`).
- **Toast integration** — `useTauriMutation` accepts `successMessage` and `errorMessage` as strings or functions, automatically displaying toasts via the shared toast store.

---

> 👀 See also: [shared/](../README.md) · [hooks/](../hooks/README.md) · [stores/](../stores/README.md) · [types/](../types/README.md)
