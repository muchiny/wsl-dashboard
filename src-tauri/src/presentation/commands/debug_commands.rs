use std::sync::Arc;

use tauri::State;

use crate::infrastructure::debug_log::buffer::{DebugLogBuffer, LogEntry};

#[tauri::command]
pub async fn get_debug_logs(buffer: State<'_, Arc<DebugLogBuffer>>) -> Result<Vec<LogEntry>, String> {
    Ok(buffer.get_all())
}

#[tauri::command]
pub async fn clear_debug_logs(buffer: State<'_, Arc<DebugLogBuffer>>) -> Result<(), String> {
    buffer.clear();
    Ok(())
}
