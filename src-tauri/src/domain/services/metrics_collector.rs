use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;

use crate::domain::entities::distro::Distro;
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
const DISTRO_CACHE_TTL_SECS: u64 = 10;

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
        let mut cached_distros: Option<(Instant, Vec<Distro>)> = None;

        loop {
            interval.tick().await;

            // Use cached distro list if fresh enough (avoids wsl.exe --list every 2s)
            let distros = match Self::get_distros(&self.wsl_manager, &mut cached_distros).await {
                Some(d) => d,
                None => continue,
            };

            let running: Vec<DistroName> = distros
                .iter()
                .filter(|d| d.state.is_running())
                .map(|d| d.name.clone())
                .collect();

            // Collect metrics from all running distros in parallel
            let results: Vec<(DistroName, Result<SystemMetrics, DomainError>)> =
                futures::future::join_all(running.into_iter().map(|name| {
                    let monitoring = Arc::clone(&self.monitoring);
                    let metrics_repo = Arc::clone(&self.metrics_repo);
                    let app_handle = app_handle.clone();
                    async move {
                        let result =
                            Self::collect_one(&monitoring, &metrics_repo, &name, &app_handle).await;
                        (name, result)
                    }
                }))
                .await;

            // Check alerts sequentially (needs mutable cooldowns)
            for (name, result) in results {
                match result {
                    Ok(metrics) => {
                        self.check_alerts(&metrics, &app_handle, &mut alert_cooldowns)
                            .await;
                    }
                    Err(e) => {
                        tracing::debug!("Metrics collection failed for {}: {e}", name.as_str());
                    }
                }
            }

            // Purge expired cooldown entries to prevent unbounded growth
            alert_cooldowns
                .retain(|_, last_fired| last_fired.elapsed().as_secs() < ALERT_COOLDOWN_SECS);
        }
    }

    /// Get distro list, using cache if fresh enough.
    async fn get_distros(
        wsl_manager: &Arc<dyn WslManagerPort>,
        cache: &mut Option<(Instant, Vec<Distro>)>,
    ) -> Option<Vec<Distro>> {
        if let &mut Some((ref mut ts, ref list)) = cache
            && ts.elapsed().as_secs() < DISTRO_CACHE_TTL_SECS
        {
            return Some(list.clone());
        }
        match wsl_manager.list_distros().await {
            Ok(d) => {
                *cache = Some((Instant::now(), d.clone()));
                Some(d)
            }
            Err(e) => {
                tracing::debug!("Metrics collector: failed to list distros: {e}");
                None
            }
        }
    }

    /// Collect, persist, and emit metrics for a single distro.
    /// Returns the metrics for subsequent alert checking.
    async fn collect_one(
        monitoring: &Arc<dyn MonitoringProviderPort>,
        metrics_repo: &Arc<dyn MetricsRepositoryPort>,
        name: &DistroName,
        app_handle: &AppHandle,
    ) -> Result<SystemMetrics, DomainError> {
        let (cpu, memory, disk, network) = monitoring.get_all_metrics(name).await?;

        let metrics = SystemMetrics {
            distro_name: name.as_str().to_string(),
            timestamp: chrono::Utc::now(),
            cpu,
            memory,
            disk,
            network,
        };

        // Store in SQLite
        if let Err(e) = metrics_repo.store_raw(&metrics).await {
            tracing::warn!("Failed to persist metrics for {}: {e}", name.as_str());
        }

        // Emit Tauri event for real-time listeners
        let _ = app_handle.emit(EVENT_SYSTEM_METRICS, &metrics);

        Ok(metrics)
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
                if let Some(last_fired) = cooldowns.get(&key)
                    && now.duration_since(*last_fired).as_secs() < ALERT_COOLDOWN_SECS
                {
                    continue;
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
