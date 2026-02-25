use std::sync::Arc;

use tauri::Emitter;
use tracing::field::{Field, Visit};
use tracing::Subscriber;
use tracing_subscriber::layer::Context;
use tracing_subscriber::Layer;

use super::buffer::DebugLogBuffer;

/// Custom tracing Layer that captures every log event into the ring buffer
/// and emits a Tauri event for real-time frontend updates.
pub struct DebugLogLayer {
    buffer: Arc<DebugLogBuffer>,
    app_handle: Arc<std::sync::OnceLock<tauri::AppHandle>>,
}

impl DebugLogLayer {
    pub fn new(buffer: Arc<DebugLogBuffer>) -> Self {
        Self {
            buffer,
            app_handle: Arc::new(std::sync::OnceLock::new()),
        }
    }

    /// Returns a shared slot to set the AppHandle later (from Tauri setup).
    pub fn app_handle_slot(&self) -> Arc<std::sync::OnceLock<tauri::AppHandle>> {
        self.app_handle.clone()
    }
}

/// Visitor that extracts the formatted message from a tracing event.
struct MessageVisitor {
    message: String,
}

impl Visit for MessageVisitor {
    fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "message" {
            self.message = value.to_string();
        }
    }

    fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            let raw = format!("{:?}", value);
            // Remove surrounding quotes from Debug formatting
            self.message = raw
                .strip_prefix('"')
                .and_then(|s| s.strip_suffix('"'))
                .unwrap_or(&raw)
                .to_string();
        }
    }
}

impl<S: Subscriber> Layer<S> for DebugLogLayer {
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        let mut visitor = MessageVisitor {
            message: String::new(),
        };
        event.record(&mut visitor);

        let level = event.metadata().level().to_string();
        let target = event.metadata().target().to_string();

        let entry = self.buffer.push(level, visitor.message, target);

        // Emit real-time event to frontend (best-effort)
        if let Some(handle) = self.app_handle.get() {
            let _ = handle.emit("debug-log-entry", &entry);
        }
    }
}
