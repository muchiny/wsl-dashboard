use std::sync::Arc;

use tokio::sync::broadcast;
use tokio::time::{interval, Duration};

use crate::domain::entities::monitoring::SystemMetrics;
use crate::domain::errors::DomainError;
use crate::domain::ports::monitoring_provider::MonitoringProviderPort;
use crate::domain::value_objects::DistroName;
use chrono::Utc;

pub struct MonitoringService {
    monitoring: Arc<dyn MonitoringProviderPort>,
    tx: broadcast::Sender<SystemMetrics>,
}

impl MonitoringService {
    pub fn new(monitoring: Arc<dyn MonitoringProviderPort>) -> Self {
        let (tx, _) = broadcast::channel(64);
        Self { monitoring, tx }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<SystemMetrics> {
        self.tx.subscribe()
    }

    /// Start a background polling task for a specific distro
    pub fn start_polling(
        self: &Arc<Self>,
        distro_name: DistroName,
        interval_ms: u64,
    ) -> tokio::task::JoinHandle<()> {
        let service = self.clone();
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_millis(interval_ms));
            loop {
                ticker.tick().await;
                match service.collect_metrics(&distro_name).await {
                    Ok(metrics) => {
                        let _ = service.tx.send(metrics);
                    }
                    Err(e) => {
                        tracing::warn!(
                            "Monitoring error for {}: {}",
                            distro_name,
                            e
                        );
                    }
                }
            }
        })
    }

    async fn collect_metrics(
        &self,
        distro: &DistroName,
    ) -> Result<SystemMetrics, DomainError> {
        let (cpu, memory, disk, network) = tokio::try_join!(
            self.monitoring.get_cpu_usage(distro),
            self.monitoring.get_memory_usage(distro),
            self.monitoring.get_disk_usage(distro),
            self.monitoring.get_network_stats(distro),
        )?;

        Ok(SystemMetrics {
            distro_name: distro.to_string(),
            timestamp: Utc::now(),
            cpu,
            memory,
            disk,
            network,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::monitoring::*;
    use crate::domain::ports::monitoring_provider::MockMonitoringProviderPort;

    fn make_cpu() -> CpuMetrics {
        CpuMetrics {
            usage_percent: 25.0,
            per_core: vec![20.0, 30.0],
            load_average: [1.0, 0.8, 0.5],
        }
    }

    fn make_memory() -> MemoryMetrics {
        MemoryMetrics {
            total_bytes: 8_000_000_000,
            used_bytes: 4_000_000_000,
            available_bytes: 4_000_000_000,
            cached_bytes: 1_000_000_000,
            swap_total_bytes: 2_000_000_000,
            swap_used_bytes: 500_000_000,
        }
    }

    fn make_disk() -> DiskMetrics {
        DiskMetrics {
            total_bytes: 100_000_000_000,
            used_bytes: 60_000_000_000,
            available_bytes: 40_000_000_000,
            usage_percent: 60.0,
        }
    }

    fn make_network() -> NetworkMetrics {
        NetworkMetrics {
            interfaces: vec![InterfaceStats {
                name: "eth0".into(),
                rx_bytes: 1000,
                tx_bytes: 2000,
                rx_packets: 10,
                tx_packets: 20,
            }],
        }
    }

    #[tokio::test]
    async fn test_collect_metrics_aggregates_all() {
        let mut mock = MockMonitoringProviderPort::new();
        mock.expect_get_cpu_usage()
            .returning(|_| Ok(make_cpu()));
        mock.expect_get_memory_usage()
            .returning(|_| Ok(make_memory()));
        mock.expect_get_disk_usage()
            .returning(|_| Ok(make_disk()));
        mock.expect_get_network_stats()
            .returning(|_| Ok(make_network()));

        let service = MonitoringService::new(Arc::new(mock));
        let distro = DistroName::new("Ubuntu").unwrap();
        let metrics = service.collect_metrics(&distro).await.unwrap();

        assert_eq!(metrics.distro_name, "Ubuntu");
        assert!((metrics.cpu.usage_percent - 25.0).abs() < f64::EPSILON);
        assert_eq!(metrics.memory.total_bytes, 8_000_000_000);
        assert!((metrics.disk.usage_percent - 60.0).abs() < f64::EPSILON);
        assert_eq!(metrics.network.interfaces.len(), 1);
        assert_eq!(metrics.network.interfaces[0].name, "eth0");
    }

    #[tokio::test]
    async fn test_collect_metrics_one_fails_returns_error() {
        let mut mock = MockMonitoringProviderPort::new();
        mock.expect_get_cpu_usage()
            .returning(|_| Err(DomainError::WslCliError("cpu fail".into())));
        mock.expect_get_memory_usage()
            .returning(|_| Ok(make_memory()));
        mock.expect_get_disk_usage()
            .returning(|_| Ok(make_disk()));
        mock.expect_get_network_stats()
            .returning(|_| Ok(make_network()));

        let service = MonitoringService::new(Arc::new(mock));
        let distro = DistroName::new("Ubuntu").unwrap();
        let result = service.collect_metrics(&distro).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_subscribe_receives_metrics() {
        let mut mock = MockMonitoringProviderPort::new();
        mock.expect_get_cpu_usage()
            .returning(|_| Ok(make_cpu()));
        mock.expect_get_memory_usage()
            .returning(|_| Ok(make_memory()));
        mock.expect_get_disk_usage()
            .returning(|_| Ok(make_disk()));
        mock.expect_get_network_stats()
            .returning(|_| Ok(make_network()));

        let service = MonitoringService::new(Arc::new(mock));
        let mut rx = service.subscribe();

        let distro = DistroName::new("Ubuntu").unwrap();
        let metrics = service.collect_metrics(&distro).await.unwrap();
        let _ = service.tx.send(metrics);

        let received = rx.recv().await.unwrap();
        assert_eq!(received.distro_name, "Ubuntu");
    }
}
