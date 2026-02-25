pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod presentation;

#[cfg(not(fuzzing))]
use std::sync::Arc;

#[cfg(not(fuzzing))]
use tauri::Manager;

#[cfg(not(fuzzing))]
use infrastructure::docker::adapter::DockerCliAdapter;
#[cfg(not(fuzzing))]
use infrastructure::iac::adapter::IacCliAdapter;
#[cfg(not(fuzzing))]
use infrastructure::monitoring::adapter::ProcFsMonitoringAdapter;
#[cfg(not(fuzzing))]
use infrastructure::sqlite::adapter::{SqliteAuditLogger, SqliteDb, SqliteSnapshotRepository};
#[cfg(not(fuzzing))]
use infrastructure::wsl_cli::adapter::WslCliAdapter;
#[cfg(not(fuzzing))]
use presentation::commands::{
    audit_commands, distro_commands, docker_commands, iac_commands, monitoring_commands,
    settings_commands, snapshot_commands,
};
#[cfg(not(fuzzing))]
use presentation::state::AppState;

#[cfg(not(fuzzing))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Panic hook: write crash info to a log file so silent crashes are diagnosable
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let msg = format!("WSL Nexus PANIC: {info}");
        if let Some(dirs) = dirs::data_dir() {
            let log_path = dirs.join("dev.muchini.wsl-nexus").join("crash.log");
            let _ = std::fs::write(&log_path, &msg);
        }
        // Also try to show a native message box (best-effort)
        #[cfg(windows)]
        {
            use std::ffi::CString;
            if let (Ok(text), Ok(title)) = (
                CString::new(msg.clone()),
                CString::new("WSL Nexus - Fatal Error"),
            ) {
                unsafe {
                    extern "system" {
                        fn MessageBoxA(
                            hwnd: *mut std::ffi::c_void,
                            text: *const i8,
                            caption: *const i8,
                            utype: u32,
                        ) -> i32;
                    }
                    MessageBoxA(
                        std::ptr::null_mut(),
                        text.as_ptr(),
                        title.as_ptr(),
                        0x10, // MB_ICONERROR
                    );
                }
            }
        }
        default_hook(info);
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Async initialization of SQLite and hexagonal wiring
            tauri::async_runtime::block_on(async move {
                let app_data_dir = app_handle.path().app_data_dir()?;

                std::fs::create_dir_all(&app_data_dir)?;

                // Use forward slashes for SQLite URI compatibility on Windows
                let db_file = app_data_dir.join("wsl-nexus.db");
                let db_path = format!("sqlite:{}", db_file.to_string_lossy().replace('\\', "/"));

                let db = SqliteDb::new(&db_path).await.map_err(|e| {
                    tracing::error!("SQLite init failed: {e}");
                    e.to_string()
                })?;

                let wsl_manager = Arc::new(WslCliAdapter::new());
                let snapshot_repo = Arc::new(SqliteSnapshotRepository::new(db.clone()));
                let monitoring = Arc::new(ProcFsMonitoringAdapter::new(wsl_manager.clone()));
                let docker = Arc::new(DockerCliAdapter::new(wsl_manager.clone()));
                let iac = Arc::new(IacCliAdapter::new(wsl_manager.clone()));
                let audit_logger = Arc::new(SqliteAuditLogger::new(db));

                let app_state = AppState {
                    wsl_manager,
                    snapshot_repo,
                    monitoring,
                    docker,
                    iac,
                    audit_logger,
                };

                app_handle.manage(app_state);
                Ok::<(), Box<dyn std::error::Error>>(())
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            distro_commands::list_distros,
            distro_commands::get_distro_details,
            distro_commands::start_distro,
            distro_commands::stop_distro,
            distro_commands::restart_distro,
            distro_commands::shutdown_all,
            snapshot_commands::list_snapshots,
            snapshot_commands::create_snapshot,
            snapshot_commands::delete_snapshot,
            snapshot_commands::restore_snapshot,
            monitoring_commands::get_system_metrics,
            monitoring_commands::get_processes,
            docker_commands::get_docker_status,
            docker_commands::docker_start_container,
            docker_commands::docker_stop_container,
            settings_commands::get_wsl_config,
            settings_commands::update_wsl_config,
            settings_commands::compact_vhdx,
            iac_commands::detect_iac_tools,
            iac_commands::get_k8s_info,
            iac_commands::run_playbook,
            audit_commands::search_audit_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Re-export for fuzzing convenience
#[cfg(fuzzing)]
pub use infrastructure::*;
