# 🐚 WSL CLI Adapter

> Bridges the domain layer to `wsl.exe`, handling UTF-16LE encoding and output parsing.

---

## 🔄 Data Flow

```mermaid
flowchart LR
    A["Command"] --> B["wsl.exe"]
    B --> C["UTF-16LE Output"]
    C --> D["encoding.rs"]
    D --> E["UTF-8 String"]
    E --> F["parser.rs"]
    F --> G["Domain Entity"]
```

## 📁 Files

| File | Description |
|------|-------------|
| `adapter.rs` | **WslCliAdapter** — implements `WslManagerPort`. Spawns `wsl.exe` subprocesses for listing distros, start/stop/restart, export/import snapshots, `.wslconfig` read/write, and `exec_in_distro`. Includes Linux ↔ Windows path conversion helpers and registry-based VHDX path resolution. |
| `encoding.rs` | **UTF-16LE decoding** — `decode_wsl_output()` detects BOM or null-byte patterns to decode UTF-16LE, with UTF-8 fallback. Includes proptest fuzz tests. |
| `parser.rs` | **Output parsing** — `parse_distro_list()` parses `wsl --list --verbose` tabular output into `Vec<Distro>`, handling default markers (`*`), blank lines, and warning preambles. |
| `mod.rs` | Module re-exports. |

## 🔑 Key Technical Detail

`wsl.exe` outputs **UTF-16LE** on Windows. The `encoding.rs` module handles this transparently:

1. Checks for a UTF-16LE BOM (`0xFF 0xFE`)
2. If no BOM, heuristically detects UTF-16LE by counting null bytes at odd positions
3. Falls back to UTF-8 if neither condition matches

This ensures correct decoding whether the app runs natively on Windows or inside WSL2.

## 🧪 Tests

- `encoding.rs`: Unit tests for UTF-8 fallback, UTF-16LE with/without BOM, and proptest fuzzing (`decode_wsl_output_never_panics`, `decode_roundtrip_utf8`)
- `parser.rs`: Parses typical output, single distro, empty output, missing headers, and warning preambles
- `adapter.rs`: Path conversion unit tests, `.wslconfig` INI parsing, registry output parsing

---

> 👀 See also: [`domain/ports/wsl_manager.rs`](../../domain/ports/wsl_manager.rs) for the port trait this adapter implements.
