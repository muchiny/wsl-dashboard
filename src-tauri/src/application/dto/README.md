# 📦 DTOs

> Data transfer objects that define the serialization contract between the Rust backend and the React frontend.

---

## 📂 File Inventory

| File | DTOs Defined | Purpose |
|------|-------------|---------|
| `responses.rs` | `DistroResponse`, `DistroDetailResponse`, `SnapshotResponse` | Serializable structs returned to the frontend via Tauri IPC |
| `mod.rs` | — | Module declarations |

## 🗂️ DTO Field Reference

### `DistroResponse`

Maps from: `Distro` entity (via `From<Distro>`)

| Field | Type | Source |
|-------|------|--------|
| `name` | `String` | `Distro.name.to_string()` |
| `state` | `String` | `Distro.state.to_string()` (e.g. `"Running"`, `"Stopped"`) |
| `wsl_version` | `u8` | `Distro.wsl_version.as_u8()` (1 or 2) |
| `is_default` | `bool` | `Distro.is_default` |
| `base_path` | `Option<String>` | `Distro.base_path` |
| `vhdx_size_bytes` | `Option<u64>` | `Distro.vhdx_size` converted to bytes |
| `last_seen` | `String` | `Distro.last_seen.to_rfc3339()` |

### `DistroDetailResponse`

Constructed manually in `GetDistroDetailsHandler` (not via `From` trait).

| Field | Type | Source |
|-------|------|--------|
| `name` | `String` | `Distro.name.to_string()` |
| `state` | `String` | `Distro.state.to_string()` |
| `wsl_version` | `u8` | `Distro.wsl_version.as_u8()` |
| `is_default` | `bool` | `Distro.is_default` |
| `base_path` | `Option<String>` | `Distro.base_path` |
| `vhdx_size_bytes` | `Option<u64>` | `Distro.vhdx_size` converted to bytes |
| `distro_config` | `Option<WslDistroConfig>` | Per-distro `/etc/wsl.conf` settings (None if unavailable) |

### `SnapshotResponse`

Maps from: `Snapshot` entity (via `From<Snapshot>`)

| Field | Type | Source |
|-------|------|--------|
| `id` | `String` | `Snapshot.id.to_string()` |
| `distro_name` | `String` | `Snapshot.distro_name.to_string()` |
| `name` | `String` | `Snapshot.name` |
| `description` | `Option<String>` | `Snapshot.description` |
| `snapshot_type` | `String` | `"full"` or `"incremental"` |
| `format` | `String` | File extension (e.g. `"tar"`, `"vhdx"`) |
| `file_path` | `String` | `Snapshot.file_path` |
| `file_size_bytes` | `u64` | `Snapshot.file_size.bytes()` |
| `parent_id` | `Option<String>` | Parent snapshot ID (for incremental snapshots) |
| `created_at` | `String` | `Snapshot.created_at.to_rfc3339()` |
| `status` | `String` | `"completed"`, `"in_progress"`, or `"failed: {reason}"` |

## 🧩 Key Patterns

- **Derive-based serialization** — All DTOs derive `Serialize` and `Deserialize` via serde, enabling automatic JSON conversion across the Tauri IPC boundary.
- **String-based enums** — Domain enums (`DistroState`, `SnapshotStatus`, `SnapshotType`) are converted to human-readable strings rather than serializing the Rust enum variants directly.
- **Timestamps as RFC 3339** — `DateTime<Utc>` values are formatted as ISO 8601 / RFC 3339 strings for consistent frontend parsing.
- **Byte-level sizes** — Memory sizes are exposed as raw `u64` byte counts, leaving formatting (KB, MB, GB) to the frontend.

---

> 👀 See also: [`commands/`](../commands/) | [`queries/`](../queries/) | [`application/`](../)
