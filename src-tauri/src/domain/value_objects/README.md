# 💠 Value Objects

> Immutable, validated types that enforce domain invariants at the type level.

---

## 📁 File Inventory

| File | Type | Validation Rule | Key Methods |
|------|------|-----------------|-------------|
| `distro_name.rs` | `DistroName(String)` | Non-empty after trimming whitespace | `new(&str)`, `as_str()`, `Display`, `AsRef<str>` |
| `distro_state.rs` | `DistroState` (enum) | Must match known WSL state string (case-insensitive) | `from_wsl_output(&str)`, `is_running()`, `Display` |
| `snapshot_id.rs` | `SnapshotId(String)` | Auto-generated UUID v4 on creation | `new()`, `from_string(String)`, `as_str()`, `Default` |
| `memory_size.rs` | `MemorySize(u64)` | Wraps raw byte count (always valid) | `from_bytes(u64)`, `zero()`, `bytes()`, `kb()`, `mb()`, `gb()`, `Display` |
| `wsl_version.rs` | `WslVersion` (enum: `V1`, `V2`) | Must be `"1"` or `"2"` | `from_str_version(&str)`, `as_u8()`, `Display` |
| `mod.rs` | Module declarations and re-exports | -- | -- |

## 🔍 Key Design Notes

- **`DistroName`** trims whitespace and rejects empty strings, returning `DomainError::InvalidDistroName`. Derives `Hash` and `Eq` for use as map keys.
- **`DistroState`** enumerates six WSL lifecycle states: `Running`, `Stopped`, `Installing`, `Converting`, `Uninstalling`, `Exporting`.
- **`SnapshotId`** is a newtype over UUID v4 string. `from_string()` accepts arbitrary strings for database hydration without re-validation.
- **`MemorySize`** auto-selects the display unit (B/KB/MB/GB) based on magnitude. Derives `Ord` for direct size comparison.
- **`WslVersion`** is a two-variant enum rather than a numeric type to prevent invalid values like `0` or `3`.

## 🧪 Tests

| File | Test Count | Notable Coverage |
|------|-----------|-----------------|
| `distro_name.rs` | 3 unit + 2 proptests | Empty rejection, whitespace trimming, fuzz for panics |
| `distro_state.rs` | 5 unit | All known states, case-insensitive parsing, unknown rejection |
| `snapshot_id.rs` | 6 unit | UUID format validation, equality semantics, `Default` |
| `memory_size.rs` | 4 unit + 2 proptests | Display at each magnitude, fuzz for panics and unit suffix |
| `wsl_version.rs` | 2 unit | V1 and V2 parsing |

---

> 👀 See also: [entities/](../entities/) | [ports/](../ports/) | [services/](../services/) | [💎 domain/](../)
