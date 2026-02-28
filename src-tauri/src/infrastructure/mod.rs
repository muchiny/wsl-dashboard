pub mod audit;
pub mod debug_log;
pub mod monitoring;
pub mod port_forwarding;
pub mod sqlite;
pub mod terminal;
pub mod wsl_cli;

/// Windows process creation flag that prevents a console window from appearing.
#[cfg(windows)]
pub(crate) const CREATE_NO_WINDOW: u32 = 0x0800_0000;
