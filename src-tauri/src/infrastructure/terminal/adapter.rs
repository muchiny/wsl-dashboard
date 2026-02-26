use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::Emitter;
use tokio::sync::RwLock;

use crate::domain::errors::DomainError;

/// Manages all active terminal sessions.
/// Stored as Tauri managed state.
pub struct TerminalSessionManager {
    sessions: RwLock<HashMap<String, PtySessionHandle>>,
}

struct PtySessionHandle {
    writer: Arc<std::sync::Mutex<Box<dyn Write + Send>>>,
    killer: Arc<std::sync::Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
    master: Arc<std::sync::Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
}

impl Default for TerminalSessionManager {
    fn default() -> Self {
        Self::new()
    }
}

impl TerminalSessionManager {
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
        }
    }

    /// Create a new terminal session connected to a WSL distro.
    /// Returns the session_id. Spawns a background reader that emits events.
    pub async fn create_session(
        &self,
        distro_name: &str,
        app_handle: tauri::AppHandle,
    ) -> Result<String, DomainError> {
        let session_id = uuid::Uuid::new_v4().to_string();

        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| DomainError::TerminalError(format!("Failed to open PTY: {e}")))?;

        let mut cmd = CommandBuilder::new("wsl.exe");
        cmd.args(["-d", distro_name]);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| DomainError::TerminalError(format!("Failed to spawn shell: {e}")))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| DomainError::TerminalError(format!("Failed to get PTY writer: {e}")))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| DomainError::TerminalError(format!("Failed to get PTY reader: {e}")))?;

        let handle = PtySessionHandle {
            writer: Arc::new(std::sync::Mutex::new(writer)),
            killer: Arc::new(std::sync::Mutex::new(child)),
            master: Arc::new(std::sync::Mutex::new(pair.master)),
        };

        self.sessions
            .write()
            .await
            .insert(session_id.clone(), handle);

        // Spawn a background thread to read PTY output and emit Tauri events
        let sid = session_id.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = buf[..n].to_vec();
                        let _ = app_handle.emit(
                            "terminal-output",
                            serde_json::json!({
                                "session_id": sid,
                                "data": data,
                            }),
                        );
                    }
                    Err(_) => break,
                }
            }
            // Session ended — notify frontend
            let _ = app_handle.emit("terminal-exit", serde_json::json!({ "session_id": sid }));
        });

        Ok(session_id)
    }

    /// Write data to a terminal session's stdin.
    pub async fn write_to_session(&self, session_id: &str, data: &[u8]) -> Result<(), DomainError> {
        let sessions = self.sessions.read().await;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| DomainError::TerminalError("Session not found".to_string()))?;

        let mut writer = session.writer.lock().unwrap();
        writer
            .write_all(data)
            .map_err(|e| DomainError::TerminalError(format!("Write failed: {e}")))?;
        writer
            .flush()
            .map_err(|e| DomainError::TerminalError(format!("Flush failed: {e}")))?;
        Ok(())
    }

    /// Resize a terminal session's PTY.
    pub async fn resize_session(
        &self,
        session_id: &str,
        cols: u16,
        rows: u16,
    ) -> Result<(), DomainError> {
        let sessions = self.sessions.read().await;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| DomainError::TerminalError("Session not found".to_string()))?;

        let master = session.master.lock().unwrap();
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| DomainError::TerminalError(format!("Resize failed: {e}")))?;
        Ok(())
    }

    /// Close a terminal session and kill the underlying process.
    pub async fn close_session(&self, session_id: &str) -> Result<(), DomainError> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.remove(session_id) {
            // Kill the child process
            if let Ok(mut child) = session.killer.lock() {
                let _ = child.kill();
            }
        }
        Ok(())
    }

    /// Close all active sessions (cleanup on app quit).
    pub async fn close_all(&self) {
        let mut sessions = self.sessions.write().await;
        for (_, session) in sessions.drain() {
            if let Ok(mut child) = session.killer.lock() {
                let _ = child.kill();
            }
        }
    }
}
