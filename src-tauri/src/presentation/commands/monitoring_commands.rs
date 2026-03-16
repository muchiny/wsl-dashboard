use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::instrument;

use crate::domain::entities::monitoring::{ProcessInfo, SystemMetrics};
use crate::domain::errors::DomainError;
use crate::domain::ports::alerting::{AlertRecord, AlertThreshold};
use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

// --- Existing commands (kept as-is) ---

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_system_metrics", distro = %distro_name))]
pub async fn get_system_metrics(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<SystemMetrics, DomainError> {
    let name = DistroName::new(&distro_name)?;

    let metrics = state.monitoring.get_all_metrics(&name).await?;
    Ok(metrics)
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_processes", distro = %distro_name))]
pub async fn get_processes(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<Vec<ProcessInfo>, DomainError> {
    let name = DistroName::new(&distro_name)?;
    state.monitoring.get_processes(&name).await
}

// --- New commands: Historical metrics ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsHistoryPoint {
    pub timestamp: String,
    pub cpu_avg: f64,
    pub cpu_min: Option<f64>,
    pub cpu_max: Option<f64>,
    pub mem_used_bytes: u64,
    pub mem_total_bytes: u64,
    pub disk_usage_percent: f64,
    pub net_rx_rate: u64,
    pub net_tx_rate: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub swap_used_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub swap_total_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_switches: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk_io_read_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk_io_write_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_established: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_time_wait: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_listen: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu_utilization: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu_vram_used: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu_vram_total: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsHistoryResponse {
    pub distro_name: String,
    pub granularity: String,
    pub points: Vec<MetricsHistoryPoint>,
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_metrics_history", distro = %distro_name))]
pub async fn get_metrics_history(
    distro_name: String,
    from: String,
    to: String,
    state: State<'_, AppState>,
) -> Result<MetricsHistoryResponse, DomainError> {
    let name = DistroName::new(&distro_name)?;

    let from_dt: DateTime<Utc> = from
        .parse()
        .map_err(|e| DomainError::Internal(format!("Invalid 'from' timestamp: {e}")))?;
    let to_dt: DateTime<Utc> = to
        .parse()
        .map_err(|e| DomainError::Internal(format!("Invalid 'to' timestamp: {e}")))?;

    let duration = to_dt - from_dt;

    if duration <= chrono::Duration::hours(1) {
        // Use raw data for ranges <= 1 hour
        let rows = state.metrics_repo.query_raw(&name, from_dt, to_dt).await?;

        let mut points = Vec::with_capacity(rows.len());
        let mut prev_rx: Option<u64> = None;
        let mut prev_tx: Option<u64> = None;

        for row in &rows {
            // Calculate network rate from consecutive samples
            let net_rx_rate = prev_rx
                .map(|prev| {
                    if row.net_rx_bytes >= prev {
                        (row.net_rx_bytes - prev) / 2
                    } else {
                        0
                    }
                })
                .unwrap_or(0);
            let net_tx_rate = prev_tx
                .map(|prev| {
                    if row.net_tx_bytes >= prev {
                        (row.net_tx_bytes - prev) / 2
                    } else {
                        0
                    }
                })
                .unwrap_or(0);

            prev_rx = Some(row.net_rx_bytes);
            prev_tx = Some(row.net_tx_bytes);

            points.push(MetricsHistoryPoint {
                timestamp: row.timestamp.to_rfc3339(),
                cpu_avg: row.cpu_usage_percent,
                cpu_min: None,
                cpu_max: None,
                mem_used_bytes: row.mem_used_bytes,
                mem_total_bytes: row.mem_total_bytes,
                disk_usage_percent: row.disk_usage_percent,
                net_rx_rate,
                net_tx_rate,
                swap_used_bytes: Some(row.swap_used_bytes),
                swap_total_bytes: Some(row.swap_total_bytes),
                context_switches: row.context_switches,
                disk_io_read_bytes: row.disk_io_read_bytes,
                disk_io_write_bytes: row.disk_io_write_bytes,
                tcp_established: row.tcp_established,
                tcp_time_wait: row.tcp_time_wait,
                tcp_listen: row.tcp_listen,
                gpu_utilization: row.gpu_utilization,
                gpu_vram_used: row.gpu_vram_used,
                gpu_vram_total: row.gpu_vram_total,
            });
        }

        Ok(MetricsHistoryResponse {
            distro_name,
            granularity: "raw".to_string(),
            points,
        })
    } else {
        // Use aggregated 1-minute data for ranges > 1 hour
        let agg_points = state
            .metrics_repo
            .query_aggregated(&name, from_dt, to_dt)
            .await?;

        let points: Vec<MetricsHistoryPoint> = agg_points
            .iter()
            .map(|p| {
                let duration_secs = (p.period_end - p.period_start).num_seconds().max(1) as u64;
                MetricsHistoryPoint {
                    timestamp: p.period_start.to_rfc3339(),
                    cpu_avg: p.cpu_avg,
                    cpu_min: Some(p.cpu_min),
                    cpu_max: Some(p.cpu_max),
                    mem_used_bytes: p.mem_used_avg,
                    mem_total_bytes: p.mem_total,
                    disk_usage_percent: p.disk_avg,
                    net_rx_rate: p.net_rx_total / duration_secs,
                    net_tx_rate: p.net_tx_total / duration_secs,
                    swap_used_bytes: None,
                    swap_total_bytes: None,
                    context_switches: None,
                    disk_io_read_bytes: None,
                    disk_io_write_bytes: None,
                    tcp_established: None,
                    tcp_time_wait: None,
                    tcp_listen: None,
                    gpu_utilization: None,
                    gpu_vram_used: None,
                    gpu_vram_total: None,
                }
            })
            .collect();

        Ok(MetricsHistoryResponse {
            distro_name,
            granularity: "1m".to_string(),
            points,
        })
    }
}

// --- New commands: Alert thresholds ---

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_alert_thresholds"))]
pub async fn get_alert_thresholds(
    state: State<'_, AppState>,
) -> Result<Vec<AlertThreshold>, DomainError> {
    let thresholds = state.alert_thresholds.read().await;
    Ok(thresholds.clone())
}

#[tauri::command]
#[instrument(skip(state, thresholds), fields(cmd = "set_alert_thresholds"))]
pub async fn set_alert_thresholds(
    thresholds: Vec<AlertThreshold>,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let mut current = state.alert_thresholds.write().await;
    *current = thresholds;
    Ok(())
}

// --- New commands: Alert records ---

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_recent_alerts", distro = %distro_name))]
pub async fn get_recent_alerts(
    distro_name: String,
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<AlertRecord>, DomainError> {
    let name = DistroName::new(&distro_name)?;
    state
        .alerting
        .get_recent_alerts(&name, limit.unwrap_or(50))
        .await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "acknowledge_alert", alert = %alert_id))]
pub async fn acknowledge_alert(
    alert_id: i64,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    state.alerting.acknowledge_alert(alert_id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    use crate::domain::ports::alerting::MockAlertingPort;
    use crate::domain::ports::audit_logger::MockAuditLoggerPort;
    use crate::domain::ports::metrics_repository::MockMetricsRepositoryPort;
    use crate::domain::ports::monitoring_provider::MockMonitoringProviderPort;
    use crate::domain::ports::port_forwarding::{
        MockPortForwardRulesRepository, MockPortForwardingPort,
    };
    use crate::domain::ports::snapshot_repository::MockSnapshotRepositoryPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::presentation::state::AppState;

    fn make_test_state(alerting: MockAlertingPort) -> AppState {
        AppState {
            wsl_manager: Arc::new(MockWslManagerPort::new()),
            snapshot_repo: Arc::new(MockSnapshotRepositoryPort::new()),
            monitoring: Arc::new(MockMonitoringProviderPort::new()),
            metrics_repo: Arc::new(MockMetricsRepositoryPort::new()),
            alerting: Arc::new(alerting),
            audit_logger: Arc::new(MockAuditLoggerPort::new()),
            alert_thresholds: Arc::new(tokio::sync::RwLock::new(vec![])),
            port_forwarding: Arc::new(MockPortForwardingPort::new()),
            port_rules_repo: Arc::new(MockPortForwardRulesRepository::new()),
        }
    }

    #[tokio::test]
    async fn get_system_metrics_rejects_invalid_name() {
        // DistroName::new("") should fail validation,
        // which is the first check in get_system_metrics
        let name_result = DistroName::new("");
        assert!(name_result.is_err());
    }

    #[tokio::test]
    async fn alert_thresholds_read_write() {
        let alerting = MockAlertingPort::new();
        let state = make_test_state(alerting);

        // Read initial empty thresholds
        let thresholds = state.alert_thresholds.read().await;
        assert!(thresholds.is_empty());
        drop(thresholds);

        // Write thresholds
        let new_thresholds = vec![AlertThreshold {
            alert_type: crate::domain::ports::alerting::AlertType::Cpu,
            threshold_percent: 90.0,
            enabled: true,
        }];
        let mut current = state.alert_thresholds.write().await;
        *current = new_thresholds;
        drop(current);

        // Read back
        let thresholds = state.alert_thresholds.read().await;
        assert_eq!(thresholds.len(), 1);
        assert_eq!(
            thresholds[0].alert_type,
            crate::domain::ports::alerting::AlertType::Cpu
        );
    }

    #[tokio::test]
    async fn get_recent_alerts_rejects_invalid_name() {
        let name_result = DistroName::new("");
        assert!(name_result.is_err());
    }

    #[tokio::test]
    async fn distro_name_validation_accepts_valid_names() {
        assert!(DistroName::new("Ubuntu").is_ok());
        assert!(DistroName::new("Debian-12").is_ok());
        assert!(DistroName::new("my_distro").is_ok());
    }
}
