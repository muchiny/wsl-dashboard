use async_trait::async_trait;
use std::sync::Arc;

use crate::domain::entities::monitoring::{
    CpuMetrics, DiskMetrics, MemoryMetrics, NetworkMetrics, ProcessInfo,
};
use crate::domain::errors::DomainError;
use crate::domain::ports::monitoring_provider::MonitoringProviderPort;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::DistroName;

/// Monitoring adapter that reads /proc/* inside WSL distros.
pub struct ProcFsMonitoringAdapter {
    wsl_manager: Arc<dyn WslManagerPort>,
}

/// Parse /proc/meminfo output into MemoryMetrics.
pub fn parse_meminfo(text: &str) -> MemoryMetrics {
    let mut total = 0u64;
    let mut available = 0u64;
    let mut cached = 0u64;
    let mut swap_total = 0u64;
    let mut swap_free = 0u64;

    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let value: u64 = parts[1].parse().unwrap_or(0) * 1024; // kB to bytes
            match parts[0] {
                "MemTotal:" => total = value,
                "MemAvailable:" => available = value,
                "Cached:" => cached = value,
                "SwapTotal:" => swap_total = value,
                "SwapFree:" => swap_free = value,
                _ => {}
            }
        }
    }

    MemoryMetrics {
        total_bytes: total,
        used_bytes: total.saturating_sub(available),
        available_bytes: available,
        cached_bytes: cached,
        swap_total_bytes: swap_total,
        swap_used_bytes: swap_total.saturating_sub(swap_free),
    }
}

/// Parse `df -B1` output into DiskMetrics.
pub fn parse_df_output(text: &str) -> DiskMetrics {
    let parts: Vec<&str> = text.split_whitespace().collect();
    if parts.len() >= 4 {
        let total: u64 = parts[1].parse().unwrap_or(0);
        let used: u64 = parts[2].parse().unwrap_or(0);
        let available: u64 = parts[3].parse().unwrap_or(0);
        let usage = if total > 0 {
            (used as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        DiskMetrics {
            total_bytes: total,
            used_bytes: used,
            available_bytes: available,
            usage_percent: usage,
        }
    } else {
        DiskMetrics {
            total_bytes: 0,
            used_bytes: 0,
            available_bytes: 0,
            usage_percent: 0.0,
        }
    }
}

/// Parse /proc/net/dev output into a list of InterfaceStats.
pub fn parse_proc_net_dev(text: &str) -> Vec<crate::domain::entities::monitoring::InterfaceStats> {
    let mut interfaces = Vec::new();
    for line in text.lines().skip(2) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 11 {
            let name = parts[0].trim_end_matches(':').to_string();
            interfaces.push(crate::domain::entities::monitoring::InterfaceStats {
                name,
                rx_bytes: parts[1].parse().unwrap_or(0),
                rx_packets: parts[2].parse().unwrap_or(0),
                tx_bytes: parts[9].parse().unwrap_or(0),
                tx_packets: parts[10].parse().unwrap_or(0),
            });
        }
    }
    interfaces
}

/// Parse `ps aux` output into a list of ProcessInfo.
pub fn parse_ps_aux(text: &str) -> Vec<ProcessInfo> {
    let mut processes = Vec::new();
    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 11 {
            processes.push(ProcessInfo {
                pid: parts[1].parse().unwrap_or(0),
                user: parts[0].to_string(),
                cpu_percent: parts[2].parse().unwrap_or(0.0),
                mem_percent: parts[3].parse().unwrap_or(0.0),
                vsz_bytes: parts[4].parse::<u64>().unwrap_or(0) * 1024,
                rss_bytes: parts[5].parse::<u64>().unwrap_or(0) * 1024,
                state: parts[7].to_string(),
                command: parts[10..].join(" "),
            });
        }
    }
    processes
}

impl ProcFsMonitoringAdapter {
    pub fn new(wsl_manager: Arc<dyn WslManagerPort>) -> Self {
        Self { wsl_manager }
    }

    /// Parse a "cpu" line from /proc/stat into (user, nice, system, idle, iowait, irq, softirq, steal).
    pub fn parse_cpu_line(line: &str) -> Option<[u64; 8]> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            return None;
        }
        let mut vals = [0u64; 8];
        for (i, part) in parts[1..].iter().take(8).enumerate() {
            vals[i] = part.parse().unwrap_or(0);
        }
        Some(vals)
    }

    /// Compute CPU usage percentage from two samples of /proc/stat values.
    pub fn cpu_usage_from_samples(before: [u64; 8], after: [u64; 8]) -> f64 {
        let total_before: u64 = before.iter().sum();
        let total_after: u64 = after.iter().sum();
        let idle_before = before[3].saturating_add(before[4]); // idle + iowait
        let idle_after = after[3].saturating_add(after[4]);

        let total_delta = total_after.saturating_sub(total_before);
        let idle_delta = idle_after.saturating_sub(idle_before);

        if total_delta == 0 {
            return 0.0;
        }
        let active_delta = total_delta.saturating_sub(idle_delta);
        (active_delta as f64 / total_delta as f64) * 100.0
    }
}

#[async_trait]
impl MonitoringProviderPort for ProcFsMonitoringAdapter {
    async fn get_cpu_usage(&self, distro: &DistroName) -> Result<CpuMetrics, DomainError> {
        // Single wsl.exe call: two /proc/stat snapshots 200ms apart + load average.
        // This halves latency vs two separate wsl.exe invocations + 500ms Rust sleep.
        let output = self
            .wsl_manager
            .exec_in_distro(
                distro,
                concat!(
                    "cat /proc/stat",
                    " && echo __NEXUS_SEP__",
                    " && sleep 0.2",
                    " && cat /proc/stat",
                    " && echo __NEXUS_SEP__",
                    " && cat /proc/loadavg",
                ),
            )
            .await?;

        let sections: Vec<&str> = output.split("__NEXUS_SEP__\n").collect();
        let (stat1, stat2, loadavg_raw) = if sections.len() >= 3 {
            (sections[0], sections[1], sections[2].trim())
        } else {
            // Fallback: return zeroed metrics rather than error
            return Ok(CpuMetrics {
                usage_percent: 0.0,
                per_core: vec![],
                load_average: [0.0; 3],
            });
        };

        // Parse load average
        let la: Vec<f64> = loadavg_raw
            .split_whitespace()
            .take(3)
            .filter_map(|s| s.parse().ok())
            .collect();
        let load_average = if la.len() >= 3 {
            [la[0], la[1], la[2]]
        } else {
            [0.0; 3]
        };

        // Parse aggregate CPU line
        let cpu_before = stat1
            .lines()
            .find(|l| l.starts_with("cpu "))
            .and_then(Self::parse_cpu_line)
            .unwrap_or([0; 8]);

        let cpu_after = stat2
            .lines()
            .find(|l| l.starts_with("cpu "))
            .and_then(Self::parse_cpu_line)
            .unwrap_or([0; 8]);

        let usage_percent = Self::cpu_usage_from_samples(cpu_before, cpu_after);

        // Parse per-core lines (cpu0, cpu1, ...)
        let cores_before: Vec<[u64; 8]> = stat1
            .lines()
            .filter(|l| l.starts_with("cpu") && !l.starts_with("cpu "))
            .filter_map(Self::parse_cpu_line)
            .collect();

        let cores_after: Vec<[u64; 8]> = stat2
            .lines()
            .filter(|l| l.starts_with("cpu") && !l.starts_with("cpu "))
            .filter_map(Self::parse_cpu_line)
            .collect();

        let per_core: Vec<f64> = cores_before
            .iter()
            .zip(cores_after.iter())
            .map(|(b, a)| Self::cpu_usage_from_samples(*b, *a))
            .collect();

        Ok(CpuMetrics {
            usage_percent,
            per_core,
            load_average,
        })
    }

    async fn get_memory_usage(&self, distro: &DistroName) -> Result<MemoryMetrics, DomainError> {
        let output = self
            .wsl_manager
            .exec_in_distro(distro, "cat /proc/meminfo")
            .await?;
        Ok(parse_meminfo(&output))
    }

    async fn get_disk_usage(&self, distro: &DistroName) -> Result<DiskMetrics, DomainError> {
        let output = self
            .wsl_manager
            .exec_in_distro(distro, "df -B1 / | tail -1")
            .await?;
        Ok(parse_df_output(&output))
    }

    async fn get_network_stats(&self, distro: &DistroName) -> Result<NetworkMetrics, DomainError> {
        let output = self
            .wsl_manager
            .exec_in_distro(distro, "cat /proc/net/dev")
            .await?;
        Ok(NetworkMetrics {
            interfaces: parse_proc_net_dev(&output),
        })
    }

    async fn get_processes(&self, distro: &DistroName) -> Result<Vec<ProcessInfo>, DomainError> {
        let output = self
            .wsl_manager
            .exec_in_distro(distro, "ps aux --no-headers --sort=-%cpu")
            .await?;
        Ok(parse_ps_aux(&output))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_cpu_line() {
        let line = "cpu  10132153 290696 3084719 46828483 16683 0 25195 0 0 0";
        let vals = ProcFsMonitoringAdapter::parse_cpu_line(line).unwrap();
        assert_eq!(vals[0], 10132153); // user
        assert_eq!(vals[3], 46828483); // idle
    }

    #[test]
    fn test_cpu_usage_from_samples() {
        let before = [10000, 0, 5000, 80000, 0, 0, 0, 0];
        let after = [10500, 0, 5200, 80300, 0, 0, 0, 0];
        // total_delta = 1000, idle_delta = 300, usage = 70%
        let usage = ProcFsMonitoringAdapter::cpu_usage_from_samples(before, after);
        assert!((usage - 70.0).abs() < 0.1);
    }

    #[test]
    fn test_cpu_usage_zero_delta() {
        let vals = [100, 0, 50, 800, 0, 0, 0, 0];
        let usage = ProcFsMonitoringAdapter::cpu_usage_from_samples(vals, vals);
        assert_eq!(usage, 0.0);
    }

    #[test]
    fn test_parse_cpu_line_short_input() {
        assert!(ProcFsMonitoringAdapter::parse_cpu_line("cpu").is_none());
        assert!(ProcFsMonitoringAdapter::parse_cpu_line("cpu 1 2").is_none());
    }

    #[tokio::test]
    async fn test_get_memory_usage_parses_meminfo() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let meminfo = "\
MemTotal:        8000000 kB
MemFree:         2000000 kB
MemAvailable:    5000000 kB
Buffers:          500000 kB
Cached:          1500000 kB
SwapTotal:       4000000 kB
SwapFree:        3000000 kB
";
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(move |_, _| Ok(meminfo.to_string()));

        let adapter = ProcFsMonitoringAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let mem = adapter.get_memory_usage(&name).await.unwrap();

        assert_eq!(mem.total_bytes, 8_000_000 * 1024);
        assert_eq!(mem.available_bytes, 5_000_000 * 1024);
        assert_eq!(mem.used_bytes, (8_000_000 - 5_000_000) * 1024);
        assert_eq!(mem.cached_bytes, 1_500_000 * 1024);
        assert_eq!(mem.swap_total_bytes, 4_000_000 * 1024);
        assert_eq!(mem.swap_used_bytes, (4_000_000 - 3_000_000) * 1024);
    }

    #[tokio::test]
    async fn test_get_disk_usage_parses_df() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok("overlay 100000000 40000000 60000000 40% /\n".to_string()));

        let adapter = ProcFsMonitoringAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let disk = adapter.get_disk_usage(&name).await.unwrap();

        assert_eq!(disk.total_bytes, 100_000_000);
        assert_eq!(disk.used_bytes, 40_000_000);
        assert_eq!(disk.available_bytes, 60_000_000);
        assert!((disk.usage_percent - 40.0).abs() < 0.1);
    }

    #[tokio::test]
    async fn test_get_disk_usage_empty_output() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok(String::new()));

        let adapter = ProcFsMonitoringAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let disk = adapter.get_disk_usage(&name).await.unwrap();
        assert_eq!(disk.total_bytes, 0);
        assert_eq!(disk.usage_percent, 0.0);
    }

    #[tokio::test]
    async fn test_get_network_stats_parses_proc_net() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let proc_net = "\
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 1000 100 0 0 0 0 0 0 2000 200 0 0 0 0 0 0
  eth0: 50000 5000 0 0 0 0 0 0 30000 3000 0 0 0 0 0 0
";
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(move |_, _| Ok(proc_net.to_string()));

        let adapter = ProcFsMonitoringAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let net = adapter.get_network_stats(&name).await.unwrap();

        assert_eq!(net.interfaces.len(), 2);
        assert_eq!(net.interfaces[0].name, "lo");
        assert_eq!(net.interfaces[0].rx_bytes, 1000);
        assert_eq!(net.interfaces[0].tx_bytes, 2000);
        assert_eq!(net.interfaces[1].name, "eth0");
        assert_eq!(net.interfaces[1].rx_bytes, 50000);
        assert_eq!(net.interfaces[1].tx_packets, 3000);
    }

    #[tokio::test]
    async fn test_get_processes_parses_ps_aux() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let ps_output = "root         1  0.1  0.5  12345  6789 ?        Ss   Jan01   0:30 /usr/lib/systemd/systemd\nnobody     100  2.5  1.2  45678 12345 ?        S    Jan01   1:00 nginx: worker process\n";
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(move |_, _| Ok(ps_output.to_string()));

        let adapter = ProcFsMonitoringAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let procs = adapter.get_processes(&name).await.unwrap();

        assert_eq!(procs.len(), 2);
        assert_eq!(procs[0].pid, 1);
        assert_eq!(procs[0].user, "root");
        assert!((procs[0].cpu_percent - 0.1).abs() < 0.01);
        assert_eq!(procs[0].command, "/usr/lib/systemd/systemd");
        assert_eq!(procs[1].pid, 100);
        assert_eq!(procs[1].command, "nginx: worker process");
    }

    #[tokio::test]
    async fn test_get_processes_empty_output() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok(String::new()));

        let adapter = ProcFsMonitoringAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let procs = adapter.get_processes(&name).await.unwrap();
        assert!(procs.is_empty());
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn parse_cpu_line_never_panics(s in "\\PC{0,200}") {
                let _ = ProcFsMonitoringAdapter::parse_cpu_line(&s);
            }

            #[test]
            fn cpu_usage_always_in_range(
                before in proptest::array::uniform8(0u64..1_000_000),
                after in proptest::array::uniform8(0u64..1_000_000)
            ) {
                let usage = ProcFsMonitoringAdapter::cpu_usage_from_samples(before, after);
                prop_assert!((0.0..=100.0).contains(&usage));
            }

            #[test]
            fn parse_meminfo_never_panics(s in "\\PC{0,500}") {
                let _ = parse_meminfo(&s);
            }

            #[test]
            fn parse_meminfo_used_le_total(s in "\\PC{0,500}") {
                let m = parse_meminfo(&s);
                prop_assert!(m.used_bytes <= m.total_bytes || m.total_bytes == 0);
            }

            #[test]
            fn parse_df_never_panics(s in "\\PC{0,200}") {
                let _ = parse_df_output(&s);
            }

            #[test]
            fn parse_df_percent_in_range(s in "\\PC{0,200}") {
                let d = parse_df_output(&s);
                prop_assert!(d.usage_percent >= 0.0 && d.usage_percent <= 100.0);
            }

            #[test]
            fn parse_proc_net_dev_never_panics(s in "\\PC{0,500}") {
                let _ = parse_proc_net_dev(&s);
            }

            #[test]
            fn parse_ps_aux_never_panics(s in "\\PC{0,500}") {
                let _ = parse_ps_aux(&s);
            }
        }
    }
}
