use tauri::{AppHandle, State};

use crate::domain::errors::DomainError;
use crate::infrastructure::terminal::adapter::TerminalSessionManager;

#[tauri::command]
pub async fn terminal_create(
    distro_name: String,
    app_handle: AppHandle,
    state: State<'_, TerminalSessionManager>,
) -> Result<String, DomainError> {
    state.create_session(&distro_name, app_handle).await
}

#[tauri::command]
pub async fn terminal_write(
    session_id: String,
    data: Vec<u8>,
    state: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    state.write_to_session(&session_id, &data).await
}

#[tauri::command]
pub async fn terminal_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    state.resize_session(&session_id, cols, rows).await
}

#[tauri::command]
pub async fn terminal_close(
    session_id: String,
    state: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    state.close_session(&session_id).await
}
