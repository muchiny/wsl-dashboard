use crate::domain::entities::distro::Distro;
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
    let mut distros = Vec::new();

    for line in text.lines().skip(1) {
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
}
