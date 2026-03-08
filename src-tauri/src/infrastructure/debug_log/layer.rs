use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

use tauri::Emitter;
use tracing::Subscriber;
use tracing::field::{Field, Visit};
use tracing::span::{Attributes, Id};
use tracing_subscriber::Layer;
use tracing_subscriber::layer::Context;
use tracing_subscriber::registry::LookupSpan;

use super::buffer::DebugLogBuffer;

/// Minimum interval (ms) between event emissions to the frontend.
const EMIT_THROTTLE_MS: u64 = 100;

/// Data stored on each span to track its timing.
struct SpanTiming {
    created_at: Instant,
    name: String,
}

/// Custom tracing Layer that captures every log event into the ring buffer
/// and emits a Tauri event for real-time frontend updates.
/// Also tracks span durations and emits timing data when spans close.
pub struct DebugLogLayer {
    buffer: Arc<DebugLogBuffer>,
    app_handle: Arc<std::sync::OnceLock<tauri::AppHandle>>,
    /// Epoch-relative timestamp (ms) of the last frontend emission.
    last_emit_ms: AtomicU64,
    /// Epoch reference for computing elapsed milliseconds.
    epoch: Instant,
}

impl DebugLogLayer {
    pub fn new(buffer: Arc<DebugLogBuffer>) -> Self {
        Self {
            buffer,
            app_handle: Arc::new(std::sync::OnceLock::new()),
            last_emit_ms: AtomicU64::new(0),
            epoch: Instant::now(),
        }
    }

    /// Returns a shared slot to set the AppHandle later (from Tauri setup).
    pub fn app_handle_slot(&self) -> Arc<std::sync::OnceLock<tauri::AppHandle>> {
        self.app_handle.clone()
    }

    /// Returns true if enough time has elapsed since the last emission.
    fn should_emit(&self) -> bool {
        let now_ms = self.epoch.elapsed().as_millis() as u64;
        let prev = self.last_emit_ms.load(Ordering::Relaxed);
        if now_ms.saturating_sub(prev) >= EMIT_THROTTLE_MS {
            // Best-effort CAS; if another thread wins, skip this emission.
            self.last_emit_ms
                .compare_exchange(prev, now_ms, Ordering::Relaxed, Ordering::Relaxed)
                .is_ok()
        } else {
            false
        }
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

impl<S> Layer<S> for DebugLogLayer
where
    S: Subscriber + for<'a> LookupSpan<'a>,
{
    fn on_new_span(&self, attrs: &Attributes<'_>, id: &Id, ctx: Context<'_, S>) {
        if let Some(span) = ctx.span(id) {
            let mut extensions = span.extensions_mut();
            extensions.insert(SpanTiming {
                created_at: Instant::now(),
                name: attrs.metadata().name().to_string(),
            });
        }
    }

    fn on_close(&self, id: Id, ctx: Context<'_, S>) {
        if let Some(span) = ctx.span(&id) {
            let extensions = span.extensions();
            if let Some(timing) = extensions.get::<SpanTiming>() {
                let duration_ms = timing.created_at.elapsed().as_secs_f64() * 1000.0;

                // Only emit spans that take >= 1ms to avoid flooding
                if duration_ms >= 1.0 {
                    let target = span.metadata().target().to_string();
                    let message = format!("span closed: {} ({:.1}ms)", timing.name, duration_ms);
                    let entry = self.buffer.push("TRACE".to_string(), message, target);

                    if let Some(handle) = self.app_handle.get() {
                        let _ = handle.emit("debug-log-entry", &entry);
                    }
                }
            }
        }
    }

    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        let mut visitor = MessageVisitor {
            message: String::new(),
        };
        event.record(&mut visitor);

        let level = event.metadata().level().to_string();
        let target = event.metadata().target().to_string();

        let entry = self.buffer.push(level, visitor.message, target);

        // Emit real-time event to frontend (throttled, best-effort)
        if self.should_emit()
            && let Some(handle) = self.app_handle.get()
        {
            let _ = handle.emit("debug-log-entry", &entry);
        }
    }
}
