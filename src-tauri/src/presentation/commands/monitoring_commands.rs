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

    let (cpu, memory, disk, network) = state.monitoring.get_all_metrics(&name).await?;

    Ok(SystemMetrics {
        distro_name,
        timestamp: chrono::Utc::now(),
        cpu,
        memory,
        disk,
        network,
    })
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
