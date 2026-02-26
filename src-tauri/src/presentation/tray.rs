use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

const MENU_SHOW: &str = "show_window";
const MENU_SHUTDOWN_ALL: &str = "shutdown_all";
const MENU_QUIT: &str = "quit";
const MENU_DISTRO_START: &str = "distro_start:";
const MENU_DISTRO_STOP: &str = "distro_stop:";

/// Set up the system tray icon with a context menu.
pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_static_menu(app)?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().unwrap())
        .tooltip("WSL Nexus")
        .menu(&menu)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Build the initial static menu (before distro list is loaded).
fn build_static_menu(app: &tauri::App) -> Result<Menu<tauri::Wry>, tauri::Error> {
    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, MENU_SHOW, "Show Window", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, MENU_SHUTDOWN_ALL, "Shutdown All", true, None::<&str>)?,
            &MenuItem::with_id(app, MENU_QUIT, "Quit WSL Nexus", true, None::<&str>)?,
        ],
    )
}

/// Rebuild the tray menu with live distro information.
pub async fn update_tray_menu(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app_handle.state::<AppState>();
    let distros = state.wsl_manager.list_distros().await.unwrap_or_default();

    let tray = app_handle.tray_by_id("main").or_else(|| {
        // Tauri v2 default tray id is the first one built
        app_handle
            .tray_by_id("tray")
            .or_else(|| app_handle.tray_by_id("default"))
    });

    let Some(tray) = tray else {
        // Fall back to iterating — Tauri auto-generates an ID
        return Ok(());
    };

    let mut items: Vec<Box<dyn tauri::menu::IsMenuItem<tauri::Wry>>> = Vec::new();

    items.push(Box::new(MenuItem::with_id(
        app_handle,
        MENU_SHOW,
        "Show Window",
        true,
        None::<&str>,
    )?));
    items.push(Box::new(PredefinedMenuItem::separator(app_handle)?));

    for distro in &distros {
        let name = distro.name.as_ref();
        let is_running = distro.state.is_running();
        let status_icon = if is_running { "●" } else { "○" };

        if is_running {
            let id = format!("{}{}", MENU_DISTRO_STOP, name);
            let label = format!("{} {} — Stop", status_icon, name);
            items.push(Box::new(MenuItem::with_id(
                app_handle,
                &id,
                &label,
                true,
                None::<&str>,
            )?));
        } else {
            let id = format!("{}{}", MENU_DISTRO_START, name);
            let label = format!("{} {} — Start", status_icon, name);
            items.push(Box::new(MenuItem::with_id(
                app_handle,
                &id,
                &label,
                true,
                None::<&str>,
            )?));
        }
    }

    items.push(Box::new(PredefinedMenuItem::separator(app_handle)?));
    items.push(Box::new(MenuItem::with_id(
        app_handle,
        MENU_SHUTDOWN_ALL,
        "Shutdown All",
        true,
        None::<&str>,
    )?));
    items.push(Box::new(MenuItem::with_id(
        app_handle,
        MENU_QUIT,
        "Quit WSL Nexus",
        true,
        None::<&str>,
    )?));

    let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> =
        items.iter().map(|i| i.as_ref()).collect();
    let menu = Menu::with_items(app_handle, &refs)?;
    tray.set_menu(Some(menu))?;

    Ok(())
}

fn handle_menu_event(app_handle: &AppHandle, event: MenuEvent) {
    let id = event.id().as_ref();

    match id {
        MENU_SHOW => {
            toggle_window(app_handle);
        }
        MENU_QUIT => {
            // Emit a quit event so frontend can clean up, then exit
            let _ = app_handle.emit("app-quit", ());
            app_handle.exit(0);
        }
        MENU_SHUTDOWN_ALL => {
            let handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let state = handle.state::<AppState>();
                if let Err(e) = state.wsl_manager.shutdown_all().await {
                    tracing::error!("Tray shutdown_all failed: {e}");
                } else {
                    let _ = state.audit_logger.log("wsl.shutdown_all", "all").await;
                    let _ = update_tray_menu(&handle).await;
                }
            });
        }
        _ => {
            // Handle distro start/stop actions
            if let Some(distro_name) = id.strip_prefix(MENU_DISTRO_START) {
                let handle = app_handle.clone();
                let name = distro_name.to_string();
                tauri::async_runtime::spawn(async move {
                    let state = handle.state::<AppState>();
                    if let Ok(dn) = DistroName::new(&name) {
                        if let Err(e) = state.wsl_manager.start_distro(&dn).await {
                            tracing::error!("Tray start {name} failed: {e}");
                        } else {
                            let _ = state.audit_logger.log("distro.start", &name).await;
                            let _ = update_tray_menu(&handle).await;
                        }
                    }
                });
            } else if let Some(distro_name) = id.strip_prefix(MENU_DISTRO_STOP) {
                let handle = app_handle.clone();
                let name = distro_name.to_string();
                tauri::async_runtime::spawn(async move {
                    let state = handle.state::<AppState>();
                    if let Ok(dn) = DistroName::new(&name) {
                        if let Err(e) = state.wsl_manager.terminate_distro(&dn).await {
                            tracing::error!("Tray stop {name} failed: {e}");
                        } else {
                            let _ = state.audit_logger.log("distro.stop", &name).await;
                            let _ = update_tray_menu(&handle).await;
                        }
                    }
                });
            }
        }
    }
}

fn toggle_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}
