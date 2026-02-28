use std::sync::Arc;

use tauri::State;
use tracing::instrument;

use crate::infrastructure::debug_log::buffer::{DebugLogBuffer, LogEntry};

#[tauri::command]
#[instrument(skip(buffer), fields(cmd = "get_debug_logs"))]
pub async fn get_debug_logs(
    buffer: State<'_, Arc<DebugLogBuffer>>,
) -> Result<Vec<LogEntry>, String> {
    Ok(buffer.get_all())
}

#[tauri::command]
#[instrument(skip(buffer), fields(cmd = "clear_debug_logs"))]
pub async fn clear_debug_logs(buffer: State<'_, Arc<DebugLogBuffer>>) -> Result<(), String> {
    buffer.clear();
    Ok(())
}
