# 📋 Audit Log

> Searchable event audit trail for all WSL management actions.

---

## 📁 Structure

```
audit-log/
├── api/
│   ├── queries.ts              # useAuditLog hook + query keys
│   └── queries.test.ts
└── ui/
    ├── audit-log-viewer.tsx    # Main audit log table
    └── audit-log-viewer.test.tsx
```

## 📦 File Inventory

| File | Type | Exports |
|------|------|---------|
| `api/queries.ts` | API | `useAuditLog`, `auditKeys`, `AuditEntry`, `SearchAuditArgs` |
| `ui/audit-log-viewer.tsx` | Component | `AuditLogViewer` |

## 🔌 API Layer

### `useAuditLog(args?: SearchAuditArgs)`

| Property | Value |
|----------|-------|
| Query Key | `["audit", "search", args]` |
| Tauri Command | `search_audit_log` |
| Default Limit | 100 |
| Default Offset | 0 |

### `SearchAuditArgs`

| Field | Type | Description |
|-------|------|-------------|
| `action_filter` | `string?` | Filter entries by action name |
| `target_filter` | `string?` | Filter entries by target name |
| `limit` | `number?` | Max entries to return (default: 100) |
| `offset` | `number?` | Pagination offset (default: 0) |

### `AuditEntry`

| Field | Type |
|-------|------|
| `id` | `number` |
| `timestamp` | `string` |
| `action` | `string` |
| `target` | `string` |
| `details` | `string \| null` |

## 🧩 Component: `AuditLogViewer`

Interactive audit log table with:

- **Header**: title with entry count badge, manual refresh button (invalidates `auditKeys.all`)
- **Filters**: two debounced search inputs (300ms) for action and target filtering
- **Table columns**: time (relative format via `formatRelativeTime`), action (styled badge), target (monospace), details (truncated)
- **States**: loading skeleton, empty state with icon, scrollable table (max-height: 24rem)

Uses `useDebounce` from `@/shared/hooks/use-debounce` for search input throttling.

---

> 👀 See also: [features/](../) | [wsl-config](../wsl-config/) | [app-preferences](../app-preferences/)
