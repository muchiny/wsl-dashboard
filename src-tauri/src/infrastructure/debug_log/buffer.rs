use serde::Serialize;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

const MAX_ENTRIES: usize = 1000;

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub id: u64,
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub target: String,
}

/// Thread-safe ring buffer that stores the last N log entries.
pub struct DebugLogBuffer {
    entries: Mutex<VecDeque<LogEntry>>,
    counter: AtomicU64,
}

impl DebugLogBuffer {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(VecDeque::with_capacity(MAX_ENTRIES)),
            counter: AtomicU64::new(0),
        }
    }

    pub fn push(&self, level: String, message: String, target: String) -> LogEntry {
        let id = self.counter.fetch_add(1, Ordering::Relaxed);
        let entry = LogEntry {
            id,
            timestamp: chrono::Local::now()
                .format("%H:%M:%S%.3f")
                .to_string(),
            level,
            message,
            target,
        };

        let mut entries = self.entries.lock().unwrap();
        if entries.len() >= MAX_ENTRIES {
            entries.pop_front();
        }
        entries.push_back(entry.clone());
        entry
    }

    pub fn get_all(&self) -> Vec<LogEntry> {
        self.entries.lock().unwrap().iter().cloned().collect()
    }

    pub fn clear(&self) {
        self.entries.lock().unwrap().clear();
    }
}
