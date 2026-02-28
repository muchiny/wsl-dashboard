pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod presentation;

#[cfg(not(fuzzing))]
use std::sync::Arc;

#[cfg(not(fuzzing))]
use tauri::Manager;

#[cfg(not(fuzzing))]
use domain::ports::alerting::AlertThreshold;
#[cfg(not(fuzzing))]
use domain::services::metrics_aggregator::MetricsAggregator;
#[cfg(not(fuzzing))]
use domain::services::metrics_collector::MetricsCollector;
#[cfg(not(fuzzing))]
use infrastructure::debug_log::buffer::DebugLogBuffer;
#[cfg(not(fuzzing))]
use infrastructure::debug_log::layer::DebugLogLayer;
#[cfg(not(fuzzing))]
use infrastructure::monitoring::adapter::ProcFsMonitoringAdapter;
#[cfg(not(fuzzing))]
use infrastructure::port_forwarding::adapter::NetshAdapter;
#[cfg(not(fuzzing))]
use infrastructure::sqlite::adapter::{SqliteAuditLogger, SqliteDb, SqliteSnapshotRepository};
#[cfg(not(fuzzing))]
use infrastructure::sqlite::alert_repository::SqliteAlertRepository;
#[cfg(not(fuzzing))]
use infrastructure::sqlite::metrics_repository::SqliteMetricsRepository;
#[cfg(not(fuzzing))]
use infrastructure::sqlite::port_forwarding_repository::SqlitePortForwardingRepository;
#[cfg(not(fuzzing))]
use infrastructure::terminal::adapter::TerminalSessionManager;
#[cfg(not(fuzzing))]
use infrastructure::wsl_cli::adapter::WslCliAdapter;
use presentation::commands::{
    audit_commands, debug_commands, distro_commands, monitoring_commands, port_forwarding_commands,
    settings_commands, snapshot_commands, terminal_commands,
};
#[cfg(not(fuzzing))]
use presentation::state::AppState;
#[cfg(not(fuzzing))]
use presentation::tray;

#[cfg(not(fuzzing))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ── Debug log infrastructure (must be set up before anything logs) ──
    let debug_buffer = Arc::new(DebugLogBuffer::new());
    let debug_layer = DebugLogLayer::new(debug_buffer.clone());
    let handle_slot = debug_layer.app_handle_slot();

    use tracing_subscriber::EnvFilter;
    use tracing_subscriber::Layer as _;
    use tracing_subscriber::filter::Targets;
    use tracing_subscriber::layer::SubscriberExt;
    use tracing_subscriber::util::SubscriberInitExt;

    // Ring-buffer filter: suppress noisy tao/wry event-loop warnings on WSL2/Linux
    let target_filter = Targets::new()
        .with_default(tracing::Level::INFO)
        .with_target("tao", tracing::Level::ERROR)
        .with_target("wry", tracing::Level::ERROR)
        .with_target("log", tracing::Level::ERROR);

    // Console filter: honour RUST_LOG env var, fall back to same defaults
    let console_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tao=error,wry=error,log=error"));

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_ansi(true)
                .with_filter(console_filter),
        )
        .with(debug_layer.with_filter(target_filter))
        .init();

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
                    unsafe extern "system" {
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

    let buffer_for_state = debug_buffer.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // Wire the AppHandle into the debug log layer for real-time events
            let _ = handle_slot.set(app_handle.clone());
            app_handle.manage(buffer_for_state);

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
                let metrics_repo = Arc::new(SqliteMetricsRepository::new(db.clone()));
                let alerting = Arc::new(SqliteAlertRepository::new(db.clone()));
                let port_rules_repo = Arc::new(SqlitePortForwardingRepository::new(db.clone()));
                let port_forwarding = Arc::new(NetshAdapter::new());
                let audit_logger = Arc::new(SqliteAuditLogger::new(db));

                // Shared alert thresholds (read by collector, written by Tauri commands)
                let alert_thresholds = Arc::new(tokio::sync::RwLock::new(vec![
                    AlertThreshold {
                        alert_type: domain::ports::alerting::AlertType::Cpu,
                        threshold_percent: 90.0,
                        enabled: true,
                    },
                    AlertThreshold {
                        alert_type: domain::ports::alerting::AlertType::Memory,
                        threshold_percent: 85.0,
                        enabled: true,
                    },
                    AlertThreshold {
                        alert_type: domain::ports::alerting::AlertType::Disk,
                        threshold_percent: 90.0,
                        enabled: true,
                    },
                ]));

                // Spawn background metrics collector (2s loop)
                let collector = MetricsCollector::new(
                    monitoring.clone(),
                    metrics_repo.clone(),
                    alerting.clone(),
                    wsl_manager.clone(),
                    alert_thresholds.clone(),
                );
                let collector_handle = app_handle.clone();
                tokio::spawn(async move {
                    collector.run(collector_handle).await;
                });

                // Spawn background metrics aggregator (60s loop)
                let aggregator = MetricsAggregator::new(metrics_repo.clone(), alerting.clone());
                tokio::spawn(async move {
                    aggregator.run().await;
                });

                let app_state = AppState {
                    wsl_manager,
                    snapshot_repo,
                    monitoring,
                    metrics_repo,
                    alerting,
                    audit_logger,
                    alert_thresholds,
                    port_forwarding,
                    port_rules_repo,
                };

                app_handle.manage(app_state);

                // Terminal session manager (separate from AppState for independent lifecycle)
                app_handle.manage(TerminalSessionManager::new());

                Ok::<(), Box<dyn std::error::Error>>(())
            })?;

            // Set up system tray icon with context menu
            if let Err(e) = tray::setup_tray(app) {
                tracing::warn!("System tray setup failed: {e}");
            }

            // Populate tray menu with distros after state is ready
            let tray_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Small delay to ensure state is fully managed
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                if let Err(e) = tray::update_tray_menu(&tray_handle).await {
                    tracing::warn!("Initial tray menu update failed: {e}");
                }
            });

            // Periodically refresh the tray menu (every 10s to match distro polling)
            let refresh_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
                loop {
                    interval.tick().await;
                    let _ = tray::update_tray_menu(&refresh_handle).await;
                }
            });

            // Intercept window close → minimize to tray instead of quitting
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            tracing::info!("WSL Nexus started successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            distro_commands::list_distros,
            distro_commands::start_distro,
            distro_commands::stop_distro,
            distro_commands::restart_distro,
            distro_commands::shutdown_all,
            distro_commands::get_distro_install_path,
            snapshot_commands::list_snapshots,
            snapshot_commands::create_snapshot,
            snapshot_commands::delete_snapshot,
            snapshot_commands::restore_snapshot,
            monitoring_commands::get_system_metrics,
            monitoring_commands::get_processes,
            monitoring_commands::get_metrics_history,
            monitoring_commands::get_alert_thresholds,
            monitoring_commands::set_alert_thresholds,
            monitoring_commands::get_recent_alerts,
            monitoring_commands::acknowledge_alert,
            settings_commands::get_wsl_config,
            settings_commands::update_wsl_config,
            settings_commands::compact_vhdx,
            settings_commands::get_wsl_version,
            audit_commands::search_audit_log,
            debug_commands::get_debug_logs,
            debug_commands::clear_debug_logs,
            terminal_commands::terminal_create,
            terminal_commands::terminal_write,
            terminal_commands::terminal_resize,
            terminal_commands::terminal_close,
            port_forwarding_commands::list_listening_ports,
            port_forwarding_commands::get_port_forwarding_rules,
            port_forwarding_commands::add_port_forwarding,
            port_forwarding_commands::remove_port_forwarding,
            port_forwarding_commands::get_wsl_ip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Re-export for fuzzing convenience
#[cfg(fuzzing)]
pub use infrastructure::*;
