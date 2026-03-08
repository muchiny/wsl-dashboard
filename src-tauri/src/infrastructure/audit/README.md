# 📋 Audit Adapter

> In-memory audit logger implementation for development and testing.

---

## 📁 Files

| File | Description |
|------|-------------|
| `adapter.rs` | **InMemoryAuditLogger** — implements `AuditLoggerPort` using a `tokio::sync::RwLock<Vec<AuditEntry>>`. Supports `log`, `log_with_details`, and `search` with filtering by action, target, time range, plus limit/offset pagination. Entries receive auto-incrementing IDs. Also emits `tracing::info!` for each logged action. |
| `mod.rs` | Module re-export. |

## 🔑 Key Technical Details

- This is a **fallback/stub** implementation — production uses `SqliteAuditLogger` from the `sqlite/` module
- Search supports combined filters: `action_filter` (substring match), `target_filter` (substring match), `since`/`until` (time range), `limit`/`offset` (pagination)
- Thread-safe via `RwLock` — concurrent reads during search, exclusive write for logging

## 🧪 Tests

- `log` and `log_with_details` entry creation
- Search with action filter, target filter, limit/offset
- Incremental ID assignment

---

> 👀 See also: [`sqlite/adapter.rs`](../sqlite/adapter.rs) for the production `SqliteAuditLogger`, and [`domain/ports/audit_logger.rs`](../../domain/ports/audit_logger.rs) for the port trait.
