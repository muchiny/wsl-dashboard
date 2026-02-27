use async_trait::async_trait;
use tokio::process::Command;

use crate::domain::entities::port_forward::ListeningPort;
use crate::domain::errors::DomainError;
use crate::domain::ports::port_forwarding::PortForwardingPort;

#[derive(Default)]
pub struct NetshAdapter;

impl NetshAdapter {
    pub fn new() -> Self {
        Self
    }

    /// Build a Command with CREATE_NO_WINDOW on Windows to prevent console popups
    fn wsl_command() -> Command {
        #[allow(unused_mut)]
        let mut cmd = Command::new("wsl.exe");
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        cmd
    }

    /// Build a netsh Command with CREATE_NO_WINDOW on Windows to prevent console popups
    fn netsh_command() -> Command {
        #[allow(unused_mut)]
        let mut cmd = Command::new("netsh.exe");
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        cmd
    }
}

#[async_trait]
impl PortForwardingPort for NetshAdapter {
    async fn list_listening_ports(
        &self,
        distro_name: &str,
    ) -> Result<Vec<ListeningPort>, DomainError> {
        let output = Self::wsl_command()
            .args(["-d", distro_name, "-e", "sh", "-c", "ss -tlnp 2>/dev/null"])
            .output()
            .await
            .map_err(|e| DomainError::IoError(format!("Failed to run ss: {e}")))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let ports = parse_ss_output(&stdout);
        Ok(ports)
    }

    async fn get_wsl_ip(&self, distro_name: &str) -> Result<String, DomainError> {
        let output = Self::wsl_command()
            .args(["-d", distro_name, "-e", "hostname", "-I"])
            .output()
            .await
            .map_err(|e| DomainError::IoError(format!("Failed to get WSL IP: {e}")))?;

        let ip = String::from_utf8_lossy(&output.stdout)
            .split_whitespace()
            .next()
            .unwrap_or("")
            .to_string();

        if ip.is_empty() {
            return Err(DomainError::IoError(
                "Could not determine WSL IP address".to_string(),
            ));
        }

        Ok(ip)
    }

    async fn apply_rule(
        &self,
        host_port: u16,
        wsl_ip: &str,
        wsl_port: u16,
    ) -> Result<(), DomainError> {
        let output = Self::netsh_command()
            .args([
                "interface",
                "portproxy",
                "add",
                "v4tov4",
                &format!("listenport={host_port}"),
                "listenaddress=0.0.0.0",
                &format!("connectport={wsl_port}"),
                &format!("connectaddress={wsl_ip}"),
            ])
            .output()
            .await
            .map_err(|e| DomainError::IoError(format!("Failed to run netsh: {e}")))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let msg = if stderr.is_empty() {
                stdout.to_string()
            } else {
                stderr.to_string()
            };
            return Err(DomainError::IoError(format!(
                "netsh portproxy add failed: {msg}. You may need to run as administrator."
            )));
        }

        Ok(())
    }

    async fn remove_rule(&self, host_port: u16) -> Result<(), DomainError> {
        let output = Self::netsh_command()
            .args([
                "interface",
                "portproxy",
                "delete",
                "v4tov4",
                &format!("listenport={host_port}"),
                "listenaddress=0.0.0.0",
            ])
            .output()
            .await
            .map_err(|e| DomainError::IoError(format!("Failed to run netsh: {e}")))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let msg = if stderr.is_empty() {
                stdout.to_string()
            } else {
                stderr.to_string()
            };
            return Err(DomainError::IoError(format!(
                "netsh portproxy delete failed: {msg}. You may need to run as administrator."
            )));
        }

        Ok(())
    }
}

/// Parse `ss -tlnp` output into ListeningPort entries.
fn parse_ss_output(output: &str) -> Vec<ListeningPort> {
    let mut ports = Vec::new();

    for line in output.lines().skip(1) {
        // State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let local_addr = parts[3];
        // Extract port from address like *:8080 or 0.0.0.0:3000 or :::22
        let port_str = local_addr.rsplit(':').next().unwrap_or("");
        let port: u16 = match port_str.parse() {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Extract process info from the last column (e.g., users:(("node",pid=1234,fd=3)))
        let process_info = parts.get(5).unwrap_or(&"");
        let process = extract_process_name(process_info);
        let pid = extract_pid(process_info);

        ports.push(ListeningPort {
            port,
            protocol: "tcp".to_string(),
            process,
            pid,
        });
    }

    // Deduplicate by port (ss may show both IPv4 and IPv6)
    ports.sort_by_key(|p| p.port);
    ports.dedup_by_key(|p| p.port);
    ports
}

fn extract_process_name(info: &str) -> String {
    // users:(("node",pid=1234,fd=3))
    if let Some(start) = info.find("((\"") {
        if let Some(end) = info[start + 3..].find('"') {
            return info[start + 3..start + 3 + end].to_string();
        }
    }
    String::new()
}

fn extract_pid(info: &str) -> Option<u32> {
    // pid=1234
    if let Some(start) = info.find("pid=") {
        let after = &info[start + 4..];
        let end = after
            .find(|c: char| !c.is_ascii_digit())
            .unwrap_or(after.len());
        after[..end].parse().ok()
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ss_output() {
        let output = r#"State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN 0      511          0.0.0.0:3000       0.0.0.0:*      users:(("node",pid=1234,fd=20))
LISTEN 0      128          0.0.0.0:22         0.0.0.0:*      users:(("sshd",pid=567,fd=3))
LISTEN 0      128             [::]:22            [::]:*      users:(("sshd",pid=567,fd=4))
"#;
        let ports = parse_ss_output(output);
        assert_eq!(ports.len(), 2); // deduped: 3000 and 22
        assert_eq!(ports[0].port, 22);
        assert_eq!(ports[0].process, "sshd");
        assert_eq!(ports[0].pid, Some(567));
        assert_eq!(ports[1].port, 3000);
        assert_eq!(ports[1].process, "node");
        assert_eq!(ports[1].pid, Some(1234));
    }

    #[test]
    fn test_parse_ss_empty() {
        let ports = parse_ss_output("");
        assert!(ports.is_empty());
    }

    #[test]
    fn test_extract_process_name() {
        assert_eq!(
            extract_process_name(r#"users:(("node",pid=1234,fd=20))"#),
            "node"
        );
        assert_eq!(extract_process_name(""), "");
    }

    #[test]
    fn test_extract_pid() {
        assert_eq!(
            extract_pid(r#"users:(("node",pid=1234,fd=20))"#),
            Some(1234)
        );
        assert_eq!(extract_pid(""), None);
    }

    #[test]
    fn test_parse_ss_header_only() {
        let output = "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process\n";
        let ports = parse_ss_output(output);
        assert!(ports.is_empty());
    }

    #[test]
    fn test_parse_ss_malformed_line() {
        let output =
            "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process\ngarbage data\n";
        let ports = parse_ss_output(output);
        assert!(ports.is_empty());
    }

    #[test]
    fn test_parse_ss_ipv6_address() {
        let output = "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN 0      128             [::]:443            [::]:*      users:((\"nginx\",pid=999,fd=6))\n";
        let ports = parse_ss_output(output);
        assert_eq!(ports.len(), 1);
        assert_eq!(ports[0].port, 443);
        assert_eq!(ports[0].process, "nginx");
    }

    #[test]
    fn test_parse_ss_wildcard_address() {
        let output = "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN 0      5                    *:8080             *:*      users:((\"python3\",pid=42,fd=3))\n";
        let ports = parse_ss_output(output);
        assert_eq!(ports.len(), 1);
        assert_eq!(ports[0].port, 8080);
    }

    #[test]
    fn test_parse_ss_no_process_info() {
        let output = "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN 0      128          0.0.0.0:5432       0.0.0.0:*\n";
        let ports = parse_ss_output(output);
        assert_eq!(ports.len(), 1);
        assert_eq!(ports[0].port, 5432);
        assert_eq!(ports[0].process, "");
        assert_eq!(ports[0].pid, None);
    }

    #[test]
    fn test_parse_ss_deduplicates_ipv4_and_ipv6() {
        let output = r#"State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN 0      128          0.0.0.0:80         0.0.0.0:*      users:(("nginx",pid=100,fd=3))
LISTEN 0      128             [::]:80            [::]:*      users:(("nginx",pid=100,fd=4))
LISTEN 0      128          0.0.0.0:443        0.0.0.0:*      users:(("nginx",pid=100,fd=5))
LISTEN 0      128             [::]:443           [::]:*      users:(("nginx",pid=100,fd=6))
"#;
        let ports = parse_ss_output(output);
        assert_eq!(ports.len(), 2);
        assert_eq!(ports[0].port, 80);
        assert_eq!(ports[1].port, 443);
    }

    #[test]
    fn test_extract_process_name_no_quotes() {
        assert_eq!(extract_process_name("some random text"), "");
    }

    #[test]
    fn test_extract_pid_no_pid_field() {
        assert_eq!(extract_pid("users:((\"node\",fd=20))"), None);
    }

    #[test]
    fn test_parse_ss_non_numeric_port() {
        let output = "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN 0      128          0.0.0.0:abc        0.0.0.0:*\n";
        let ports = parse_ss_output(output);
        assert!(ports.is_empty());
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            /// parse_ss_output must never panic on arbitrary input
            #[test]
            fn parse_ss_never_panics(input in "\\PC{0,500}") {
                let _ = parse_ss_output(&input);
            }

            /// extract_process_name must never panic on arbitrary input
            #[test]
            fn extract_process_name_never_panics(input in "\\PC{0,200}") {
                let _ = extract_process_name(&input);
            }

            /// extract_pid must never panic on arbitrary input
            #[test]
            fn extract_pid_never_panics(input in "\\PC{0,200}") {
                let _ = extract_pid(&input);
            }

            /// Ports returned are always unique
            #[test]
            fn parse_ss_ports_are_unique(input in "\\PC{0,500}") {
                let ports = parse_ss_output(&input);
                let mut seen = std::collections::HashSet::new();
                for p in &ports {
                    prop_assert!(seen.insert(p.port), "Duplicate port: {}", p.port);
                }
            }

            /// Ports returned are always sorted
            #[test]
            fn parse_ss_ports_are_sorted(input in "\\PC{0,500}") {
                let ports = parse_ss_output(&input);
                for w in ports.windows(2) {
                    prop_assert!(w[0].port <= w[1].port);
                }
            }

            /// Well-formed ss lines always produce a valid port
            #[test]
            fn well_formed_ss_line_parsed(port in 1u16..=65535u16, proc_name in "[a-z]{1,10}", pid in 1u32..100000u32) {
                let line = format!(
                    "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN 0      128          0.0.0.0:{}       0.0.0.0:*      users:((\"{}\",pid={},fd=3))\n",
                    port, proc_name, pid
                );
                let ports = parse_ss_output(&line);
                prop_assert_eq!(ports.len(), 1);
                prop_assert_eq!(ports[0].port, port);
                prop_assert_eq!(&ports[0].process, &proc_name);
                prop_assert_eq!(ports[0].pid, Some(pid));
            }
        }
    }
}
