use serde::Serialize;
use std::collections::VecDeque;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};

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

impl Default for DebugLogBuffer {
    fn default() -> Self {
        Self::new()
    }
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
            timestamp: chrono::Local::now().format("%H:%M:%S%.3f").to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    fn make_entry(buf: &DebugLogBuffer, msg: &str) -> LogEntry {
        buf.push(
            "INFO".to_string(),
            msg.to_string(),
            "test::target".to_string(),
        )
    }

    // --- Construction ---

    #[test]
    fn new_buffer_is_empty() {
        let buf = DebugLogBuffer::new();
        assert!(buf.get_all().is_empty());
    }

    #[test]
    fn new_buffer_counter_starts_at_zero() {
        let buf = DebugLogBuffer::new();
        let entry = make_entry(&buf, "first");
        assert_eq!(entry.id, 0);
    }

    // --- Push & retrieve ---

    #[test]
    fn push_returns_entry_with_correct_fields() {
        let buf = DebugLogBuffer::new();
        let entry = buf.push(
            "WARN".to_string(),
            "something happened".to_string(),
            "my::module".to_string(),
        );

        assert_eq!(entry.level, "WARN");
        assert_eq!(entry.message, "something happened");
        assert_eq!(entry.target, "my::module");
        assert!(!entry.timestamp.is_empty());
    }

    #[test]
    fn push_single_entry_appears_in_get_all() {
        let buf = DebugLogBuffer::new();
        make_entry(&buf, "hello");

        let all = buf.get_all();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].message, "hello");
    }

    #[test]
    fn push_multiple_entries_all_appear() {
        let buf = DebugLogBuffer::new();
        for i in 0..5 {
            make_entry(&buf, &format!("msg-{i}"));
        }

        let all = buf.get_all();
        assert_eq!(all.len(), 5);
    }

    // --- Counter increments ---

    #[test]
    fn counter_increments_sequentially() {
        let buf = DebugLogBuffer::new();
        let ids: Vec<u64> = (0..10).map(|_| make_entry(&buf, "x").id).collect();
        let expected: Vec<u64> = (0..10).collect();
        assert_eq!(ids, expected);
    }

    #[test]
    fn counter_continues_after_clear() {
        let buf = DebugLogBuffer::new();
        make_entry(&buf, "before"); // id=0
        make_entry(&buf, "before"); // id=1
        buf.clear();

        let entry = make_entry(&buf, "after");
        assert_eq!(entry.id, 2, "counter should not reset on clear");
    }

    // --- FIFO ordering ---

    #[test]
    fn entries_are_fifo_ordered() {
        let buf = DebugLogBuffer::new();
        for i in 0..5 {
            make_entry(&buf, &format!("msg-{i}"));
        }

        let all = buf.get_all();
        for (idx, entry) in all.iter().enumerate() {
            assert_eq!(entry.message, format!("msg-{idx}"));
            assert_eq!(entry.id, idx as u64);
        }
    }

    // --- Buffer size limit (ring buffer eviction) ---

    #[test]
    fn buffer_does_not_exceed_max_entries() {
        let buf = DebugLogBuffer::new();
        let total = MAX_ENTRIES + 200;
        for i in 0..total {
            make_entry(&buf, &format!("msg-{i}"));
        }

        let all = buf.get_all();
        assert_eq!(all.len(), MAX_ENTRIES);
    }

    #[test]
    fn oldest_entries_are_evicted_when_full() {
        let buf = DebugLogBuffer::new();
        let total = MAX_ENTRIES + 50;
        for i in 0..total {
            make_entry(&buf, &format!("msg-{i}"));
        }

        let all = buf.get_all();
        // The first 50 entries (msg-0..msg-49) should have been evicted
        assert_eq!(all[0].message, "msg-50");
        assert_eq!(all[0].id, 50);
        // The last entry should be the most recent
        assert_eq!(all.last().unwrap().message, format!("msg-{}", total - 1));
    }

    #[test]
    fn buffer_at_exact_capacity_does_not_evict() {
        let buf = DebugLogBuffer::new();
        for i in 0..MAX_ENTRIES {
            make_entry(&buf, &format!("msg-{i}"));
        }

        let all = buf.get_all();
        assert_eq!(all.len(), MAX_ENTRIES);
        assert_eq!(all[0].message, "msg-0");
        assert_eq!(
            all.last().unwrap().message,
            format!("msg-{}", MAX_ENTRIES - 1)
        );
    }

    #[test]
    fn one_past_capacity_evicts_first_entry() {
        let buf = DebugLogBuffer::new();
        for i in 0..=MAX_ENTRIES {
            make_entry(&buf, &format!("msg-{i}"));
        }

        let all = buf.get_all();
        assert_eq!(all.len(), MAX_ENTRIES);
        assert_eq!(all[0].message, "msg-1", "msg-0 should have been evicted");
    }

    // --- Clear ---

    #[test]
    fn clear_removes_all_entries() {
        let buf = DebugLogBuffer::new();
        for _ in 0..10 {
            make_entry(&buf, "x");
        }
        assert_eq!(buf.get_all().len(), 10);

        buf.clear();
        assert!(buf.get_all().is_empty());
    }

    #[test]
    fn clear_on_empty_buffer_is_noop() {
        let buf = DebugLogBuffer::new();
        buf.clear(); // should not panic
        assert!(buf.get_all().is_empty());
    }

    #[test]
    fn push_works_after_clear() {
        let buf = DebugLogBuffer::new();
        make_entry(&buf, "before");
        buf.clear();
        make_entry(&buf, "after");

        let all = buf.get_all();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].message, "after");
    }

    // --- Thread safety ---

    #[test]
    fn concurrent_pushes_are_all_recorded() {
        let buf = Arc::new(DebugLogBuffer::new());
        let threads: Vec<_> = (0..8)
            .map(|t| {
                let buf = Arc::clone(&buf);
                std::thread::spawn(move || {
                    for i in 0..100 {
                        buf.push(
                            "INFO".to_string(),
                            format!("t{t}-msg{i}"),
                            "test".to_string(),
                        );
                    }
                })
            })
            .collect();

        for t in threads {
            t.join().unwrap();
        }

        let all = buf.get_all();
        assert_eq!(all.len(), 800, "8 threads x 100 entries = 800 total");
    }

    #[test]
    fn concurrent_pushes_produce_unique_ids() {
        let buf = Arc::new(DebugLogBuffer::new());
        let threads: Vec<_> = (0..4)
            .map(|_| {
                let buf = Arc::clone(&buf);
                std::thread::spawn(move || {
                    (0..50)
                        .map(|_| {
                            buf.push("DEBUG".to_string(), "msg".to_string(), "test".to_string())
                                .id
                        })
                        .collect::<Vec<_>>()
                })
            })
            .collect();

        let mut all_ids: Vec<u64> = threads
            .into_iter()
            .flat_map(|t| t.join().unwrap())
            .collect();
        all_ids.sort();
        all_ids.dedup();

        assert_eq!(all_ids.len(), 200, "all 200 IDs should be unique");
    }

    #[test]
    fn concurrent_push_and_read_does_not_panic() {
        let buf = Arc::new(DebugLogBuffer::new());

        let writer = {
            let buf = Arc::clone(&buf);
            std::thread::spawn(move || {
                for i in 0..500 {
                    buf.push("INFO".to_string(), format!("w-{i}"), "test".to_string());
                }
            })
        };

        let reader = {
            let buf = Arc::clone(&buf);
            std::thread::spawn(move || {
                for _ in 0..500 {
                    let _ = buf.get_all();
                }
            })
        };

        writer.join().unwrap();
        reader.join().unwrap();
    }

    #[test]
    fn concurrent_push_and_clear_does_not_panic() {
        let buf = Arc::new(DebugLogBuffer::new());

        let writer = {
            let buf = Arc::clone(&buf);
            std::thread::spawn(move || {
                for i in 0..500 {
                    buf.push("INFO".to_string(), format!("w-{i}"), "test".to_string());
                }
            })
        };

        let clearer = {
            let buf = Arc::clone(&buf);
            std::thread::spawn(move || {
                for _ in 0..50 {
                    buf.clear();
                }
            })
        };

        writer.join().unwrap();
        clearer.join().unwrap();

        // After both finish, buffer should be in a valid state
        let _ = buf.get_all();
    }

    // --- Timestamp ---

    #[test]
    fn entry_timestamp_is_hms_format() {
        let buf = DebugLogBuffer::new();
        let entry = make_entry(&buf, "ts-check");
        // Format is %H:%M:%S%.3f e.g. "14:05:32.123"
        let parts: Vec<&str> = entry.timestamp.split(':').collect();
        assert_eq!(parts.len(), 3, "timestamp should have HH:MM:SS.mmm format");
    }
}
