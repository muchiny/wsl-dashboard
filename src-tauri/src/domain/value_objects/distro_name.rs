use crate::domain::errors::DomainError;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DistroName(String);

impl DistroName {
    pub fn new(name: &str) -> Result<Self, DomainError> {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(DomainError::InvalidDistroName(
                "Distribution name cannot be empty".to_string(),
            ));
        }
        Ok(Self(trimmed.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for DistroName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl AsRef<str> for DistroName {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_distro_name() {
        let name = DistroName::new("Ubuntu-24.04").unwrap();
        assert_eq!(name.as_str(), "Ubuntu-24.04");
    }

    #[test]
    fn test_empty_distro_name_rejected() {
        let result = DistroName::new("");
        assert!(result.is_err());
    }

    #[test]
    fn test_whitespace_trimmed() {
        let name = DistroName::new("  Ubuntu  ").unwrap();
        assert_eq!(name.as_str(), "Ubuntu");
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn distro_name_never_panics(s in "\\PC{0,100}") {
                let _ = DistroName::new(&s);
            }

            #[test]
            fn distro_name_trims_whitespace(s in " +[a-zA-Z]+ +") {
                let name = DistroName::new(&s).unwrap();
                prop_assert!(!name.as_str().starts_with(' '));
                prop_assert!(!name.as_str().ends_with(' '));
            }
        }
    }
}
