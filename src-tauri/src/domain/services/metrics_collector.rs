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
const DISTRO_CACHE_TTL_SECS: u64 = 2;

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
        let metrics = monitoring.get_all_metrics(name).await?;

        // Store in SQLite
        if let Err(e) = metrics_repo.store_raw(&metrics).await {
            tracing::warn!("Failed to persist metrics for {}: {e}", name.as_str());
        }

        // Emit Tauri event for real-time listeners
        let _ = app_handle.emit(EVENT_SYSTEM_METRICS, &metrics);

        Ok(metrics)
    }

    #[cfg(test)]
    async fn check_alerts_headless(
        alerting: &Arc<dyn AlertingPort>,
        alert_thresholds: &Arc<tokio::sync::RwLock<Vec<AlertThreshold>>>,
        metrics: &SystemMetrics,
        cooldowns: &mut HashMap<(String, String), Instant>,
    ) {
        let thresholds = alert_thresholds.read().await;
        let now = Instant::now();

        for threshold in thresholds.iter().filter(|t| t.enabled) {
            let actual_value = match threshold.alert_type {
                AlertType::Cpu => metrics.cpu.usage_percent,
                AlertType::Memory => {
                    if metrics.memory.total_bytes == 0 {
                        continue;
                    }
                    (metrics.memory.used_bytes as f64 / metrics.memory.total_bytes as f64) * 100.0
                }
                AlertType::Disk => metrics.disk.usage_percent,
            };

            if actual_value >= threshold.threshold_percent {
                let key = (
                    metrics.distro_name.clone(),
                    threshold.alert_type.to_string(),
                );

                if let Some(last_fired) = cooldowns.get(&key)
                    && now.duration_since(*last_fired).as_secs() < ALERT_COOLDOWN_SECS
                {
                    continue;
                }

                cooldowns.insert(key, now);

                if let Ok(name) = DistroName::new(&metrics.distro_name) {
                    let _ = alerting
                        .record_alert(
                            &name,
                            threshold.alert_type,
                            threshold.threshold_percent,
                            actual_value,
                        )
                        .await;
                }
            }
        }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::distro::Distro;
    use crate::domain::entities::monitoring::{
        CpuMetrics, DiskMetrics, MemoryMetrics, NetworkMetrics,
    };
    use crate::domain::ports::alerting::MockAlertingPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::domain::value_objects::{DistroState, WslVersion};

    fn make_distro(name: &str, state: DistroState) -> Distro {
        Distro::new(DistroName::new(name).unwrap(), state, WslVersion::V2, false)
    }

    fn make_metrics(
        distro_name: &str,
        cpu: f64,
        mem_used: u64,
        mem_total: u64,
        disk: f64,
    ) -> SystemMetrics {
        SystemMetrics {
            distro_name: distro_name.to_string(),
            timestamp: chrono::Utc::now(),
            cpu: CpuMetrics {
                usage_percent: cpu,
                per_core: vec![cpu],
                load_average: [0.0, 0.0, 0.0],
            },
            memory: MemoryMetrics {
                total_bytes: mem_total,
                used_bytes: mem_used,
                available_bytes: mem_total - mem_used,
                cached_bytes: 0,
                swap_total_bytes: 0,
                swap_used_bytes: 0,
            },
            disk: DiskMetrics {
                total_bytes: 100_000_000,
                used_bytes: 50_000_000,
                available_bytes: 50_000_000,
                usage_percent: disk,
            },
            network: NetworkMetrics { interfaces: vec![] },
            context_switches: None,
            disk_io: None,
            tcp_connections: None,
            gpu: None,
        }
    }

    // --- get_distros cache tests ---

    #[tokio::test]
    async fn get_distros_fetches_from_wsl_manager_on_empty_cache() {
        let mut mock = MockWslManagerPort::new();
        let distro = make_distro("Ubuntu", DistroState::Running);
        let distro_clone = distro.clone();

        mock.expect_list_distros()
            .times(1)
            .returning(move || Ok(vec![distro_clone.clone()]));

        let wsl: Arc<dyn WslManagerPort> = Arc::new(mock);
        let mut cache: Option<(Instant, Vec<Distro>)> = None;

        let result = MetricsCollector::get_distros(&wsl, &mut cache).await;
        assert!(result.is_some());
        let distros = result.unwrap();
        assert_eq!(distros.len(), 1);
        assert_eq!(distros[0].name.as_str(), "Ubuntu");
        // Cache should now be populated
        assert!(cache.is_some());
    }

    #[tokio::test]
    async fn get_distros_uses_cache_when_fresh() {
        let mut mock = MockWslManagerPort::new();
        // list_distros should NOT be called when cache is fresh
        mock.expect_list_distros().times(0);

        let wsl: Arc<dyn WslManagerPort> = Arc::new(mock);
        let distro = make_distro("Debian", DistroState::Stopped);
        let mut cache: Option<(Instant, Vec<Distro>)> = Some((Instant::now(), vec![distro]));

        let result = MetricsCollector::get_distros(&wsl, &mut cache).await;
        assert!(result.is_some());
        let distros = result.unwrap();
        assert_eq!(distros.len(), 1);
        assert_eq!(distros[0].name.as_str(), "Debian");
    }

    #[tokio::test]
    async fn get_distros_refreshes_cache_when_expired() {
        let mut mock = MockWslManagerPort::new();
        let fresh_distro = make_distro("Fedora", DistroState::Running);
        let fresh_clone = fresh_distro.clone();

        mock.expect_list_distros()
            .times(1)
            .returning(move || Ok(vec![fresh_clone.clone()]));

        let wsl: Arc<dyn WslManagerPort> = Arc::new(mock);
        let stale_distro = make_distro("OldDistro", DistroState::Stopped);
        // Set cache timestamp to 11 seconds ago (TTL is 10s)
        let stale_time = Instant::now() - Duration::from_secs(11);
        let mut cache: Option<(Instant, Vec<Distro>)> = Some((stale_time, vec![stale_distro]));

        let result = MetricsCollector::get_distros(&wsl, &mut cache).await;
        assert!(result.is_some());
        let distros = result.unwrap();
        assert_eq!(distros.len(), 1);
        assert_eq!(distros[0].name.as_str(), "Fedora");
    }

    #[tokio::test]
    async fn get_distros_returns_none_when_wsl_manager_fails() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_list_distros()
            .returning(|| Err(DomainError::Internal("wsl.exe failed".into())));

        let wsl: Arc<dyn WslManagerPort> = Arc::new(mock);
        let mut cache: Option<(Instant, Vec<Distro>)> = None;

        let result = MetricsCollector::get_distros(&wsl, &mut cache).await;
        assert!(result.is_none());
    }

    // --- check_alerts_headless tests ---

    #[tokio::test]
    async fn alert_triggered_when_cpu_exceeds_threshold() {
        let mut alerting = MockAlertingPort::new();
        alerting
            .expect_record_alert()
            .times(1)
            .returning(|_, _, _, _| Ok(()));

        let alerting: Arc<dyn AlertingPort> = Arc::new(alerting);
        let thresholds = Arc::new(tokio::sync::RwLock::new(vec![AlertThreshold {
            alert_type: AlertType::Cpu,
            threshold_percent: 80.0,
            enabled: true,
        }]));

        let metrics = make_metrics("Ubuntu", 95.0, 0, 1, 0.0);
        let mut cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;

        // Cooldown entry should be recorded
        assert!(cooldowns.contains_key(&("Ubuntu".to_string(), "cpu".to_string())));
    }

    #[tokio::test]
    async fn alert_not_triggered_when_value_below_threshold() {
        let mut alerting = MockAlertingPort::new();
        // record_alert should NOT be called
        alerting.expect_record_alert().times(0);

        let alerting: Arc<dyn AlertingPort> = Arc::new(alerting);
        let thresholds = Arc::new(tokio::sync::RwLock::new(vec![AlertThreshold {
            alert_type: AlertType::Cpu,
            threshold_percent: 80.0,
            enabled: true,
        }]));

        let metrics = make_metrics("Ubuntu", 50.0, 0, 1, 0.0);
        let mut cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;

        assert!(cooldowns.is_empty());
    }

    #[tokio::test]
    async fn cooldown_prevents_duplicate_alerts() {
        let mut alerting = MockAlertingPort::new();
        // record_alert should only be called once (first invocation)
        alerting
            .expect_record_alert()
            .times(1)
            .returning(|_, _, _, _| Ok(()));

        let alerting: Arc<dyn AlertingPort> = Arc::new(alerting);
        let thresholds = Arc::new(tokio::sync::RwLock::new(vec![AlertThreshold {
            alert_type: AlertType::Cpu,
            threshold_percent: 80.0,
            enabled: true,
        }]));

        let metrics = make_metrics("Ubuntu", 95.0, 0, 1, 0.0);
        let mut cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        // First call: should trigger alert
        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;

        // Second call: should be suppressed by cooldown
        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;
    }

    #[tokio::test]
    async fn disabled_threshold_does_not_trigger_alert() {
        let mut alerting = MockAlertingPort::new();
        alerting.expect_record_alert().times(0);

        let alerting: Arc<dyn AlertingPort> = Arc::new(alerting);
        let thresholds = Arc::new(tokio::sync::RwLock::new(vec![AlertThreshold {
            alert_type: AlertType::Cpu,
            threshold_percent: 80.0,
            enabled: false,
        }]));

        let metrics = make_metrics("Ubuntu", 95.0, 0, 1, 0.0);
        let mut cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;

        assert!(cooldowns.is_empty());
    }

    #[tokio::test]
    async fn memory_alert_triggers_on_percentage() {
        let mut alerting = MockAlertingPort::new();
        alerting
            .expect_record_alert()
            .times(1)
            .returning(|_, _, _, _| Ok(()));

        let alerting: Arc<dyn AlertingPort> = Arc::new(alerting);
        let thresholds = Arc::new(tokio::sync::RwLock::new(vec![AlertThreshold {
            alert_type: AlertType::Memory,
            threshold_percent: 90.0,
            enabled: true,
        }]));

        // 95% memory usage (950 / 1000)
        let metrics = make_metrics("Ubuntu", 0.0, 950, 1000, 0.0);
        let mut cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;

        assert!(cooldowns.contains_key(&("Ubuntu".to_string(), "memory".to_string())));
    }

    #[tokio::test]
    async fn memory_alert_skips_when_total_is_zero() {
        let mut alerting = MockAlertingPort::new();
        alerting.expect_record_alert().times(0);

        let alerting: Arc<dyn AlertingPort> = Arc::new(alerting);
        let thresholds = Arc::new(tokio::sync::RwLock::new(vec![AlertThreshold {
            alert_type: AlertType::Memory,
            threshold_percent: 90.0,
            enabled: true,
        }]));

        // total_bytes = 0 should cause a skip
        let metrics = make_metrics("Ubuntu", 0.0, 0, 0, 0.0);
        let mut cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;

        assert!(cooldowns.is_empty());
    }

    #[tokio::test]
    async fn multiple_thresholds_can_trigger_independently() {
        let mut alerting = MockAlertingPort::new();
        // Both CPU and Disk should trigger
        alerting
            .expect_record_alert()
            .times(2)
            .returning(|_, _, _, _| Ok(()));

        let alerting: Arc<dyn AlertingPort> = Arc::new(alerting);
        let thresholds = Arc::new(tokio::sync::RwLock::new(vec![
            AlertThreshold {
                alert_type: AlertType::Cpu,
                threshold_percent: 80.0,
                enabled: true,
            },
            AlertThreshold {
                alert_type: AlertType::Disk,
                threshold_percent: 70.0,
                enabled: true,
            },
        ]));

        let metrics = make_metrics("Ubuntu", 95.0, 0, 1, 85.0);
        let mut cooldowns: HashMap<(String, String), Instant> = HashMap::new();

        MetricsCollector::check_alerts_headless(&alerting, &thresholds, &metrics, &mut cooldowns)
            .await;

        assert_eq!(cooldowns.len(), 2);
    }
}
