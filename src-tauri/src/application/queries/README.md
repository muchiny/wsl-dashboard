# 🔍 Queries

> CQRS read-side handlers that fetch data through domain ports and return serializable DTOs to the frontend.

---

## 📂 File Inventory

| File | Query | Parameters | Return Type |
|------|-------|------------|-------------|
| `list_distros.rs` | `ListDistrosHandler` | None | `Vec<DistroResponse>` |
| `get_distro_details.rs` | `GetDistroDetailsHandler` | `DistroName` | `DistroDetailResponse` |
| `list_snapshots.rs` | `ListSnapshotsHandler` | `Option<DistroName>` | `Vec<SnapshotResponse>` |
| `mod.rs` | — | — | — |

## 🧩 Key Patterns

- **No side effects** — Query handlers are strictly read-only. They never modify state, write to disk, or call the audit logger.
- **DTO mapping** — Each handler converts domain entities (`Distro`, `Snapshot`) into response DTOs using `From` trait implementations, decoupling the domain model from the serialization contract.
- **Optional filtering** — `ListSnapshotsHandler` accepts an optional `DistroName` parameter; when provided it delegates to `list_by_distro()`, otherwise it calls `list_all()`.
- **Graceful degradation** — `GetDistroDetailsHandler` calls `get_distro_config()` separately and converts failures to `None` rather than failing the entire query, so the response is still useful when per-distro config is unavailable.
- **Single port dependency** — Each query handler depends on exactly one domain port (`WslManagerPort` or `SnapshotRepositoryPort`), keeping the read path simple and testable.

---

> 👀 See also: [`commands/`](../commands/) | [`dto/`](../dto/) | [`application/`](../)
