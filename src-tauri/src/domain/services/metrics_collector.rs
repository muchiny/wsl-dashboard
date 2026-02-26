use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;

use crate::domain::entities::monitoring::SystemMetrics;
use crate::domain::errors::DomainError;
use crate::domain::ports::alerting::{AlertThreshold, AlertType, AlertingPort};
use crate::domain::ports::metrics_repository::MetricsRepositoryPort;
use crate::domain::ports::monitoring_provider::MonitoringProviderPort;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::DistroName;
use crate::presentation::events::{EVENT_ALERT_TRIGGERED, EVENT_SYSTEM_METRICS};

const COLLECTION_INTERVAL_SECS: u64 = 2;
const ALERT_COOLDOWN_SECS: u64 = 300; // 5 minutes between same alert type/distro

/// Background service that collects metrics from all running distros,
/// persists them, emits Tauri events, and checks alert thresholds.
pub struct MetricsCollector {
    monitoring: Arc<dyn MonitoringProviderPort>,
    metrics_repo: Arc<dyn MetricsRepositoryPort>,
    alerting: Arc<dyn AlertingPort>,
    wsl_manager: Arc<dyn WslManagerPort>,
    alert_thresholds: Arc<tokio::sync::RwLock<Vec<AlertThreshold>>>,
}

impl MetricsCollector {
    pub fn new(
        monitoring: Arc<dyn MonitoringProviderPort>,
        metrics_repo: Arc<dyn MetricsRepositoryPort>,
        alerting: Arc<dyn AlertingPort>,
        wsl_manager: Arc<dyn WslManagerPort>,
        alert_thresholds: Arc<tokio::sync::RwLock<Vec<AlertThreshold>>>,
    ) -> Self {
        Self {
            monitoring,
            metrics_repo,
            alerting,
            wsl_manager,
            alert_thresholds,
        }
    }

    pub async fn run(self, app_handle: AppHandle) {
        let mut interval = tokio::time::interval(Duration::from_secs(COLLECTION_INTERVAL_SECS));
        let mut alert_cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        loop {
            interval.tick().await;

            let distros = match self.wsl_manager.list_distros().await {
                Ok(d) => d,
                Err(e) => {
                    tracing::debug!("Metrics collector: failed to list distros: {e}");
                    continue;
                }
            };

            for distro in distros.iter().filter(|d| d.state.is_running()) {
                let name = &distro.name;

                match self.collect_and_store(name, &app_handle, &mut alert_cooldowns).await {
                    Ok(_) => {}
                    Err(e) => {
                        tracing::debug!("Metrics collection failed for {}: {e}", name.as_str());
                    }
                }
            }
        }
    }

    async fn collect_and_store(
        &self,
        name: &DistroName,
        app_handle: &AppHandle,
        alert_cooldowns: &mut HashMap<(String, String), Instant>,
    ) -> Result<(), DomainError> {
        let (cpu, memory, disk, network) = tokio::try_join!(
            self.monitoring.get_cpu_usage(name),
            self.monitoring.get_memory_usage(name),
            self.monitoring.get_disk_usage(name),
            self.monitoring.get_network_stats(name),
        )?;

        let metrics = SystemMetrics {
            distro_name: name.as_str().to_string(),
            timestamp: chrono::Utc::now(),
            cpu,
            memory,
            disk,
            network,
        };

        // Store in SQLite
        if let Err(e) = self.metrics_repo.store_raw(&metrics).await {
            tracing::warn!("Failed to persist metrics for {}: {e}", name.as_str());
        }

        // Emit Tauri event for real-time listeners
        let _ = app_handle.emit(EVENT_SYSTEM_METRICS, &metrics);

        // Check alert thresholds
        self.check_alerts(&metrics, app_handle, alert_cooldowns)
            .await;

        Ok(())
    }

    async fn check_alerts(
        &self,
        metrics: &SystemMetrics,
        app_handle: &AppHandle,
        cooldowns: &mut HashMap<(String, String), Instant>,
    ) {
        let thresholds = self.alert_thresholds.read().await;
        let now = Instant::now();

        for threshold in thresholds.iter().filter(|t| t.enabled) {
            let (actual_value, label) = match threshold.alert_type {
                AlertType::Cpu => (metrics.cpu.usage_percent, "CPU"),
                AlertType::Memory => {
                    if metrics.memory.total_bytes == 0 {
                        continue;
                    }
                    let pct = (metrics.memory.used_bytes as f64
                        / metrics.memory.total_bytes as f64)
                        * 100.0;
                    (pct, "Memory")
                }
                AlertType::Disk => (metrics.disk.usage_percent, "Disk"),
            };

            if actual_value >= threshold.threshold_percent {
                let key = (
                    metrics.distro_name.clone(),
                    threshold.alert_type.to_string(),
                );

                // Check cooldown
                if let Some(last_fired) = cooldowns.get(&key) {
                    if now.duration_since(*last_fired).as_secs() < ALERT_COOLDOWN_SECS {
                        continue;
                    }
                }

                cooldowns.insert(key, now);

                // Record in database
                if let Ok(name) = DistroName::new(&metrics.distro_name) {
                    let _ = self
                        .alerting
                        .record_alert(
                            &name,
                            threshold.alert_type,
                            threshold.threshold_percent,
                            actual_value,
                        )
                        .await;
                }

                // Emit event
                let alert_event = serde_json::json!({
                    "distro_name": metrics.distro_name,
                    "alert_type": threshold.alert_type,
                    "threshold": threshold.threshold_percent,
                    "actual_value": actual_value,
                });
                let _ = app_handle.emit(EVENT_ALERT_TRIGGERED, &alert_event);

                // Desktop notification
                let _ = app_handle
                    .notification()
                    .builder()
                    .title(format!("{} Alert - {}", label, metrics.distro_name))
                    .body(format!(
                        "{} usage at {:.1}% (threshold: {:.0}%)",
                        label, actual_value, threshold.threshold_percent
                    ))
                    .show();
            }
        }
    }
}
