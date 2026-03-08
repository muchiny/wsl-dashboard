# 💻 Terminal Adapter

> Manages interactive terminal sessions connected to WSL2 distros via pseudo-terminals (PTY).

---

## 🔄 Session Lifecycle

```mermaid
sequenceDiagram
    participant Frontend
    participant TerminalSessionManager
    participant portable-pty
    participant wsl.exe

    Frontend->>TerminalSessionManager: create_session(distro_name)
    TerminalSessionManager->>portable-pty: openpty(24x80)
    portable-pty->>wsl.exe: spawn("wsl.exe -d distro")
    portable-pty-->>TerminalSessionManager: PTY Master + Child

    Note over TerminalSessionManager: Spawns background reader thread

    loop Read Loop (background thread)
        portable-pty-->>TerminalSessionManager: read(4096 bytes)
        TerminalSessionManager-->>Frontend: emit("terminal-output", {session_id, data})
    end

    Frontend->>TerminalSessionManager: write_to_session(data)
    TerminalSessionManager->>portable-pty: write_all(data)

    Frontend->>TerminalSessionManager: resize_session(cols, rows)
    TerminalSessionManager->>portable-pty: resize(PtySize)

    Frontend->>TerminalSessionManager: close_session()
    TerminalSessionManager->>portable-pty: kill()
    TerminalSessionManager-->>Frontend: emit("terminal-exit", {session_id})
```

## 📁 Files

| File | Description |
|------|-------------|
| `adapter.rs` | **TerminalSessionManager** — stored as Tauri managed state. Maintains a `RwLock<HashMap<String, PtySessionHandle>>` of active sessions. Each session holds a PTY writer, child process handle, and master PTY reference. Methods: `create_session`, `write_to_session`, `resize_session`, `is_session_alive`, `close_session`. |
| `mod.rs` | Module re-export. |

## 🔑 Key Technical Details

- Sessions identified by UUID v4 strings
- Uses `portable-pty` crate for cross-platform PTY support
- Background reader thread emits `terminal-output` Tauri events with raw byte data
- `terminal-exit` event emitted when the PTY read loop ends (process exited)
- Writer and child process wrapped in `Arc<Mutex<...>>` for thread-safe access
- Default terminal size: 24 rows x 80 columns

---

> 👀 See also: [`presentation/terminal_commands.rs`](../../presentation/terminal_commands.rs) for the Tauri IPC commands that expose this adapter.
