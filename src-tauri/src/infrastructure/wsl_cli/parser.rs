use crate::domain::entities::distro::Distro;
use crate::domain::entities::wsl_version::WslVersionInfo;
use crate::domain::errors::DomainError;
use crate::domain::value_objects::{DistroName, DistroState, WslVersion};

/// Parse the output of `wsl.exe --list --verbose`
///
/// Expected format (after UTF-16 decode):
/// ```text
///   NAME              STATE           VERSION
/// * FedoraLinux-43    Running         2
///   Ubuntu-24.04      Stopped         2
/// ```
pub fn parse_distro_list(text: &str) -> Result<Vec<Distro>, DomainError> {
    let mut lines = text.lines();

    // Skip lines until we find the header (contains "NAME" and "STATE")
    let header_found = lines.by_ref().any(|line| {
        let upper = line.to_uppercase();
        upper.contains("NAME") && upper.contains("STATE")
    });

    if !header_found {
        return Ok(Vec::new());
    }

    let mut distros = Vec::new();

    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let is_default = line.contains('*');

        // Remove the '*' marker and extra whitespace
        let clean_line = line.replace('*', " ");
        let parts: Vec<&str> = clean_line.split_whitespace().collect();

        if parts.len() < 3 {
            continue;
        }

        let name = DistroName::new(parts[0])?;
        let state = DistroState::from_wsl_output(parts[1])?;
        let version = WslVersion::from_str_version(parts[2])?;

        distros.push(Distro::new(name, state, version, is_default));
    }

    Ok(distros)
}

/// Parse `wsl --version` output into structured version info.
///
/// Uses product-name keyword matching ("WSL", "WSLg", "Windows") which are
/// universal across all locales. The kernel line — whose label varies by
/// locale (English "Kernel", French "noyau", etc.) — is identified as the
/// first unmatched line containing a version number.
///
/// Keywords are only matched in the label portion (before the first digit)
/// to avoid false positives from version values like
/// `6.6.87.2-microsoft-standard-WSL2` which contain "WSL".
pub fn parse_version_output(text: &str) -> WslVersionInfo {
    fn extract_version(line: &str) -> Option<String> {
        if let Some((_, after)) = line.rsplit_once(':') {
            let val = after.trim();
            if !val.is_empty() {
                return Some(val.to_string());
            }
        }
        line.split_whitespace()
            .rev()
            .find(|tok| tok.starts_with(|c: char| c.is_ascii_digit()))
            .map(|s| s.to_string())
    }

    let mut info = WslVersionInfo::default();
    let mut unmatched_versions: Vec<String> = Vec::new();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let label_end = line
            .find(|c: char| c.is_ascii_digit())
            .unwrap_or(line.len());
        let label = line[..label_end].to_lowercase();

        if label.contains("wslg") {
            info.wslg_version = extract_version(line);
        } else if label.contains("wsl") {
            info.wsl_version = extract_version(line);
        } else if label.contains("windows") {
            info.windows_version = extract_version(line);
        } else if let Some(ver) = extract_version(line) {
            unmatched_versions.push(ver);
        }
    }

    if info.kernel_version.is_none() {
        info.kernel_version = unmatched_versions.into_iter().next();
    }

    info
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_typical_output() {
        let input = "  NAME              STATE           VERSION\n\
                      * FedoraLinux-43    Running         2\n\
                        Ubuntu-24.04      Stopped         2\n";

        let distros = parse_distro_list(input).unwrap();
        assert_eq!(distros.len(), 2);

        assert_eq!(distros[0].name.as_str(), "FedoraLinux-43");
        assert!(distros[0].is_default);
        assert_eq!(distros[0].state, DistroState::Running);
        assert_eq!(distros[0].wsl_version, WslVersion::V2);

        assert_eq!(distros[1].name.as_str(), "Ubuntu-24.04");
        assert!(!distros[1].is_default);
        assert_eq!(distros[1].state, DistroState::Stopped);
    }

    #[test]
    fn test_parse_single_distro() {
        let input = "  NAME      STATE     VERSION\n\
                      * Ubuntu    Running   2\n";

        let distros = parse_distro_list(input).unwrap();
        assert_eq!(distros.len(), 1);
        assert!(distros[0].is_default);
    }

    #[test]
    fn test_parse_empty_output() {
        let input = "  NAME      STATE     VERSION\n";
        let distros = parse_distro_list(input).unwrap();
        assert!(distros.is_empty());
    }

    #[test]
    fn test_skip_blank_lines() {
        let input = "  NAME      STATE     VERSION\n\n\
                      * Ubuntu    Running   2\n\n";
        let distros = parse_distro_list(input).unwrap();
        assert_eq!(distros.len(), 1);
    }

    #[test]
    fn test_parse_completely_empty_input() {
        let distros = parse_distro_list("").unwrap();
        assert!(distros.is_empty());
    }

    #[test]
    fn test_parse_no_header() {
        let input = "Some random text without the expected columns";
        let distros = parse_distro_list(input).unwrap();
        assert!(distros.is_empty());
    }

    #[test]
    fn test_parse_warning_before_header() {
        let input = "Warning: some WSL message\n\
                      NAME      STATE     VERSION\n\
                      * Ubuntu    Running   2\n";
        let distros = parse_distro_list(input).unwrap();
        assert_eq!(distros.len(), 1);
        assert_eq!(distros[0].name.as_str(), "Ubuntu");
    }

    #[test]
    fn test_parse_version_english() {
        let output = "WSL version: 2.6.3.0\nKernel version: 6.6.87.2-microsoft-standard-WSL2\nWSLg version: 1.0.71\nWindows version: 10.0.26200.7922\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(
            info.kernel_version.as_deref(),
            Some("6.6.87.2-microsoft-standard-WSL2")
        );
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.26200.7922"));
    }

    #[test]
    fn test_parse_version_french() {
        let output = "Version WSL : 2.6.3.0\nVersion du noyau : 6.6.87.2-microsoft-standard-WSL2\nVersion WSLg : 1.0.71\nVersion de Windows : 10.0.26200.7922\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(
            info.kernel_version.as_deref(),
            Some("6.6.87.2-microsoft-standard-WSL2")
        );
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.26200.7922"));
    }

    #[test]
    fn test_parse_version_with_extra_lines() {
        let output = "WSL version: 2.6.3.0\nKernel version: 6.6.87.2-microsoft-standard-WSL2\nWSLg version: 1.0.71\nMSRDC version: 1.2.5620\nDirect3D version: 1.611.1-81528511\nDXCore version: 10.0.26100.1\nWindows version: 10.0.26200.7922\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(
            info.kernel_version.as_deref(),
            Some("6.6.87.2-microsoft-standard-WSL2")
        );
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.26200.7922"));
    }

    #[test]
    fn test_parse_version_no_colon_format() {
        let output = "WSL version 2.6.3.0\nKernel version 5.15.133.1\nWSLg version 1.0.71\nWindows version 10.0.22631\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(info.kernel_version.as_deref(), Some("5.15.133.1"));
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.22631"));
    }
}
