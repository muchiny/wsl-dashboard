use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub distro_name: String,
    pub timestamp: DateTime<Utc>,
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disk: DiskMetrics,
    pub network: NetworkMetrics,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_switches: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk_io: Option<DiskIoMetrics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_connections: Option<TcpConnectionMetrics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu: Option<GpuMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuMetrics {
    pub usage_percent: f64,
    pub per_core: Vec<f64>,
    pub load_average: [f64; 3],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub cached_bytes: u64,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub interfaces: Vec<InterfaceStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceStats {
    pub name: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_packets: u64,
    pub tx_packets: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskIoMetrics {
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpConnectionMetrics {
    pub established: u32,
    pub time_wait: u32,
    pub listen: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuMetrics {
    pub utilization_percent: Option<f64>,
    pub vram_used_bytes: Option<u64>,
    pub vram_total_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub user: String,
    pub cpu_percent: f64,
    pub mem_percent: f64,
    pub vsz_bytes: u64,
    pub rss_bytes: u64,
    pub command: String,
    pub state: String,
}
