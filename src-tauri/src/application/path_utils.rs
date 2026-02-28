/// Convert a Windows `X:\...` path to Linux `/mnt/x/...` for filesystem access from WSL.
/// Passes through paths that are already Linux-style.
pub fn windows_to_linux_path(path: &str) -> String {
    let mut chars = path.chars();
    if let Some(drive) = chars.next()
        && drive.is_ascii_alphabetic()
        && chars.next() == Some(':')
        && matches!(chars.next(), Some('\\') | Some('/'))
    {
        let rest: String = chars.collect::<String>().replace('\\', "/");
        return format!("/mnt/{}/{}", drive.to_ascii_lowercase(), rest);
    }
    path.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_converts_windows_backslash() {
        assert_eq!(
            windows_to_linux_path(r"C:\Users\foo\snap.tar"),
            "/mnt/c/Users/foo/snap.tar"
        );
    }

    #[test]
    fn test_converts_windows_forward_slash() {
        assert_eq!(
            windows_to_linux_path("D:/Projects/bar"),
            "/mnt/d/Projects/bar"
        );
    }

    #[test]
    fn test_passthrough_linux_path() {
        assert_eq!(
            windows_to_linux_path("/mnt/c/Users/foo"),
            "/mnt/c/Users/foo"
        );
    }

    #[test]
    fn test_passthrough_relative_path() {
        assert_eq!(windows_to_linux_path("snap.tar"), "snap.tar");
    }
}
