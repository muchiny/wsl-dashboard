use tauri::{AppHandle, State};
use tracing::instrument;

use crate::domain::errors::DomainError;
use crate::infrastructure::terminal::adapter::TerminalSessionManager;

#[tauri::command]
#[instrument(skip(state, app_handle), fields(cmd = "terminal_create", distro = %distro_name))]
pub async fn terminal_create(
    distro_name: String,
    app_handle: AppHandle,
    state: State<'_, TerminalSessionManager>,
) -> Result<String, DomainError> {
    state.create_session(&distro_name, app_handle).await
}

#[tauri::command]
#[instrument(skip(state, data), fields(cmd = "terminal_write", session = %session_id))]
pub async fn terminal_write(
    session_id: String,
    data: Vec<u8>,
    state: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    state.write_to_session(&session_id, &data).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "terminal_resize", session = %session_id))]
pub async fn terminal_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    state.resize_session(&session_id, cols, rows).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "terminal_is_alive", session = %session_id))]
pub async fn terminal_is_alive(
    session_id: String,
    state: State<'_, TerminalSessionManager>,
) -> Result<bool, DomainError> {
    Ok(state.is_session_alive(&session_id).await)
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "terminal_close", session = %session_id))]
pub async fn terminal_close(
    session_id: String,
    state: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    state.close_session(&session_id).await
}
