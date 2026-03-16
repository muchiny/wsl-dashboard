/// Convert a Linux /mnt/X/... path to Windows X:\... for wsl.exe commands.
/// Also normalizes mixed-separator paths (e.g. `C:\Users\snapshots/file.tar`)
/// to use consistent backslashes on Windows.
pub fn linux_to_windows_path(path: &str) -> String {
    // Match /mnt/c/Users/... -> C:\Users\...
    if let Some(rest) = path.strip_prefix("/mnt/")
        && let Some((drive, remainder)) = rest.split_once('/')
        && drive.len() == 1
    {
        return format!(
            "{}:\\{}",
            drive.to_uppercase(),
            remainder.replace('/', "\\")
        );
    }
    // Normalize mixed separators: if the path already has backslashes (Windows)
    // but also contains forward slashes, unify to backslashes.
    // e.g. "C:\Users\snapshots/Ubuntu-xxx.tar" → "C:\Users\snapshots\Ubuntu-xxx.tar"
    #[cfg(windows)]
    if path.contains('\\') && path.contains('/') {
        return path.replace('/', "\\");
    }
    path.to_string()
}

/// Extract a WSL-style Windows home directory from a path entry.
/// Matches patterns like `/mnt/c/Users/username/...` and returns `/mnt/c/Users/username`.
pub fn extract_wsl_user_home(path: &str) -> Option<String> {
    let lower = path.to_lowercase();
    let idx = lower.find("/mnt/")?;
    let after_mnt = &path[idx + 5..]; // after "/mnt/" e.g. "c/Users/loicw/AppData/..."
    let mut parts = after_mnt.splitn(4, '/');
    let drive = parts.next()?; // "c"
    let users_dir = parts.next()?; // "Users"
    if users_dir.to_lowercase() != "users" {
        return None;
    }
    let username = parts.next()?; // "loicw"
    if username.is_empty() {
        return None;
    }
    Some(format!("/mnt/{}/{}/{}", drive, users_dir, username))
}

/// Parse `reg.exe query HKCU\...\Lxss /s` output to find the BasePath
/// for a given distribution name.
///
/// The output format is blocks separated by blank lines:
/// ```text
/// HKEY_CURRENT_USER\...\Lxss\{guid}
///     DistributionName    REG_SZ    Ubuntu
///     BasePath    REG_SZ    C:\Users\user\...\LocalState
/// ```
#[cfg(not(windows))]
pub fn parse_reg_basepath(output: &str, distro_name: &str) -> Option<String> {
    let mut in_matching_block = false;

    for line in output.lines() {
        let trimmed = line.trim();
        // A line starting with HKEY_ marks a new registry key block
        if trimmed.starts_with("HKEY_") {
            in_matching_block = false;
            continue;
        }

        // Parse value lines: "    Name    REG_SZ    Value"
        let parts: Vec<&str> = trimmed.splitn(3, "    ").collect();
        if parts.len() == 3 && parts[1] == "REG_SZ" {
            if parts[0] == "DistributionName" && parts[2] == distro_name {
                in_matching_block = true;
            } else if in_matching_block && parts[0] == "BasePath" {
                // Strip \\?\ extended-length path prefix if present
                let base = parts[2].strip_prefix(r"\\?\").unwrap_or(parts[2]);
                return Some(base.to_string());
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::path_utils::windows_to_linux_path;

    #[test]
    fn test_windows_to_linux_path_basic() {
        assert_eq!(windows_to_linux_path(r"C:\Users\foo"), "/mnt/c/Users/foo");
    }

    #[test]
    fn test_windows_to_linux_path_forward_slash() {
        assert_eq!(
            windows_to_linux_path("D:/Projects/bar"),
            "/mnt/d/Projects/bar"
        );
    }

    #[test]
    fn test_windows_to_linux_path_passthrough() {
        assert_eq!(
            windows_to_linux_path("/mnt/c/Users/foo"),
            "/mnt/c/Users/foo"
        );
    }

    #[test]
    fn test_extract_wsl_user_home_basic() {
        assert_eq!(
            extract_wsl_user_home("/mnt/c/Users/loicw/AppData/Local/Microsoft/WindowsApps"),
            Some("/mnt/c/Users/loicw".to_string()),
        );
    }

    #[test]
    fn test_extract_wsl_user_home_exact_path() {
        assert_eq!(
            extract_wsl_user_home("/mnt/c/Users/name"),
            Some("/mnt/c/Users/name".to_string()),
        );
    }

    #[test]
    fn test_extract_wsl_user_home_no_match() {
        assert_eq!(extract_wsl_user_home("/usr/bin/something"), None);
    }

    #[test]
    fn test_extract_wsl_user_home_no_username() {
        assert_eq!(extract_wsl_user_home("/mnt/c/Users/"), None);
    }

    #[test]
    fn test_extract_wsl_user_home_not_users_dir() {
        assert_eq!(extract_wsl_user_home("/mnt/c/Program Files/app"), None);
    }

    #[test]
    fn test_extract_wsl_user_home_case_insensitive_users() {
        assert_eq!(
            extract_wsl_user_home("/mnt/c/users/john/AppData"),
            Some("/mnt/c/users/john".to_string()),
        );
    }

    #[cfg(not(windows))]
    #[test]
    fn test_parse_reg_basepath_finds_distro() {
        let output = "\
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss\\{aaa-bbb}
    DistributionName    REG_SZ    Ubuntu
    BasePath    REG_SZ    C:\\Users\\user\\AppData\\Local\\Packages\\Ubuntu\\LocalState
    Version    REG_DWORD    0x2

HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss\\{ccc-ddd}
    DistributionName    REG_SZ    Debian
    BasePath    REG_SZ    C:\\Users\\user\\AppData\\Local\\Packages\\Debian\\LocalState
";
        assert_eq!(
            parse_reg_basepath(output, "Ubuntu"),
            Some("C:\\Users\\user\\AppData\\Local\\Packages\\Ubuntu\\LocalState".into())
        );
        assert_eq!(
            parse_reg_basepath(output, "Debian"),
            Some("C:\\Users\\user\\AppData\\Local\\Packages\\Debian\\LocalState".into())
        );
    }

    #[cfg(not(windows))]
    #[test]
    fn test_parse_reg_basepath_not_found() {
        let output = "\
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss\\{aaa-bbb}
    DistributionName    REG_SZ    Ubuntu
    BasePath    REG_SZ    C:\\somewhere
";
        assert_eq!(parse_reg_basepath(output, "Fedora"), None);
    }

    #[cfg(not(windows))]
    #[test]
    fn test_parse_reg_basepath_empty_output() {
        assert_eq!(parse_reg_basepath("", "Ubuntu"), None);
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn extract_wsl_user_home_never_panics(s in "\\PC{0,200}") {
                let _ = extract_wsl_user_home(&s);
            }
        }
    }
}
