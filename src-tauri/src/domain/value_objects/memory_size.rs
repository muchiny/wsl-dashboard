use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct MemorySize(u64);

impl MemorySize {
    pub fn from_bytes(bytes: u64) -> Self {
        Self(bytes)
    }

    pub fn zero() -> Self {
        Self(0)
    }

    pub fn bytes(&self) -> u64 {
        self.0
    }

    pub fn kb(&self) -> f64 {
        self.0 as f64 / 1024.0
    }

    pub fn mb(&self) -> f64 {
        self.0 as f64 / (1024.0 * 1024.0)
    }

    pub fn gb(&self) -> f64 {
        self.0 as f64 / (1024.0 * 1024.0 * 1024.0)
    }
}

impl fmt::Display for MemorySize {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.0 >= 1024 * 1024 * 1024 {
            write!(f, "{:.2} GB", self.gb())
        } else if self.0 >= 1024 * 1024 {
            write!(f, "{:.2} MB", self.mb())
        } else if self.0 >= 1024 {
            write!(f, "{:.2} KB", self.kb())
        } else {
            write!(f, "{} B", self.0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_bytes() {
        assert_eq!(MemorySize::from_bytes(500).to_string(), "500 B");
    }

    #[test]
    fn test_display_kb() {
        assert_eq!(MemorySize::from_bytes(2048).to_string(), "2.00 KB");
    }

    #[test]
    fn test_display_mb() {
        assert_eq!(
            MemorySize::from_bytes(1024 * 1024 * 5).to_string(),
            "5.00 MB"
        );
    }

    #[test]
    fn test_display_gb() {
        assert_eq!(
            MemorySize::from_bytes(1024 * 1024 * 1024 * 2).to_string(),
            "2.00 GB"
        );
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn memory_display_never_panics(bytes in any::<u64>()) {
                let _ = MemorySize::from_bytes(bytes).to_string();
            }

            #[test]
            fn memory_display_contains_unit(bytes in any::<u64>()) {
                let s = MemorySize::from_bytes(bytes).to_string();
                prop_assert!(
                    s.ends_with(" B") || s.ends_with(" KB") ||
                    s.ends_with(" MB") || s.ends_with(" GB")
                );
            }
        }
    }
}
