use async_trait::async_trait;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use std::str::FromStr;

use crate::domain::entities::snapshot::{
    ExportFormat, Snapshot, SnapshotStatus, SnapshotType,
};
use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::{AuditEntry, AuditLoggerPort, AuditQuery};
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::value_objects::{DistroName, MemorySize, SnapshotId};

/// Shared SQLite connection pool.
#[derive(Clone)]
pub struct SqliteDb {
    pool: SqlitePool,
}

impl SqliteDb {
    pub async fn new(db_path: &str) -> Result<Self, DomainError> {
        let options = SqliteConnectOptions::from_str(db_path)
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        // Run migrations
        sqlx::query(include_str!("migrations/001_initial.sql"))
            .execute(&pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(Self { pool })
    }
}

// --- Snapshot Repository ---

pub struct SqliteSnapshotRepository {
    db: SqliteDb,
}

impl SqliteSnapshotRepository {
    pub fn new(db: SqliteDb) -> Self {
        Self { db }
    }

    fn row_to_snapshot(&self, row: &sqlx::sqlite::SqliteRow) -> Result<Snapshot, DomainError> {
        let status_str: String = row.get("status");
        let status = if status_str == "in_progress" {
            SnapshotStatus::InProgress
        } else if status_str == "completed" {
            SnapshotStatus::Completed
        } else if let Some(reason) = status_str.strip_prefix("failed:") {
            SnapshotStatus::Failed(reason.trim().to_string())
        } else {
            SnapshotStatus::Completed
        };

        let snapshot_type_str: String = row.get("snapshot_type");
        let snapshot_type = if snapshot_type_str == "incremental" {
            SnapshotType::PseudoIncremental
        } else {
            SnapshotType::Full
        };

        let format_str: String = row.get("format");
        let format = match format_str.as_str() {
            "tar.gz" => ExportFormat::TarGz,
            "tar.xz" => ExportFormat::TarXz,
            "vhdx" => ExportFormat::Vhd,
            _ => ExportFormat::Tar,
        };

        let parent_id: Option<String> = row.get("parent_id");
        let created_str: String = row.get("created_at");

        Ok(Snapshot {
            id: SnapshotId::from_string(row.get("id")),
            distro_name: DistroName::new(row.get::<&str, _>("distro_name"))?,
            name: row.get("name"),
            description: row.get("description"),
            snapshot_type,
            format,
            file_path: row.get("file_path"),
            file_size: MemorySize::from_bytes(row.get::<i64, _>("file_size") as u64),
            parent_id: parent_id.map(SnapshotId::from_string),
            created_at: chrono::DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now()),
            status,
        })
    }
}

#[async_trait]
impl SnapshotRepositoryPort for SqliteSnapshotRepository {
    async fn save(&self, snapshot: &Snapshot) -> Result<(), DomainError> {
        let status_str = match &snapshot.status {
            SnapshotStatus::InProgress => "in_progress".to_string(),
            SnapshotStatus::Completed => "completed".to_string(),
            SnapshotStatus::Failed(reason) => format!("failed: {}", reason),
        };

        let snapshot_type = match snapshot.snapshot_type {
            SnapshotType::Full => "full",
            SnapshotType::PseudoIncremental => "incremental",
        };

        sqlx::query(
            "INSERT OR REPLACE INTO snapshots (id, distro_name, name, description, snapshot_type, format, file_path, file_size, parent_id, created_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(snapshot.id.as_str())
        .bind(snapshot.distro_name.as_str())
        .bind(&snapshot.name)
        .bind(&snapshot.description)
        .bind(snapshot_type)
        .bind(snapshot.format.extension())
        .bind(&snapshot.file_path)
        .bind(snapshot.file_size.bytes() as i64)
        .bind(snapshot.parent_id.as_ref().map(|id| id.as_str().to_string()))
        .bind(snapshot.created_at.to_rfc3339())
        .bind(&status_str)
        .execute(&self.db.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn list_by_distro(&self, distro: &DistroName) -> Result<Vec<Snapshot>, DomainError> {
        let rows = sqlx::query("SELECT * FROM snapshots WHERE distro_name = ? ORDER BY created_at DESC")
            .bind(distro.as_str())
            .fetch_all(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        rows.iter().map(|r| self.row_to_snapshot(r)).collect()
    }

    async fn list_all(&self) -> Result<Vec<Snapshot>, DomainError> {
        let rows = sqlx::query("SELECT * FROM snapshots ORDER BY created_at DESC")
            .fetch_all(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        rows.iter().map(|r| self.row_to_snapshot(r)).collect()
    }

    async fn get_by_id(&self, id: &SnapshotId) -> Result<Snapshot, DomainError> {
        let row = sqlx::query("SELECT * FROM snapshots WHERE id = ?")
            .bind(id.as_str())
            .fetch_optional(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?
            .ok_or_else(|| DomainError::SnapshotNotFound(id.to_string()))?;

        self.row_to_snapshot(&row)
    }

    async fn delete(&self, id: &SnapshotId) -> Result<(), DomainError> {
        sqlx::query("DELETE FROM snapshots WHERE id = ?")
            .bind(id.as_str())
            .execute(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;
        Ok(())
    }
}

// --- Audit Logger backed by SQLite ---

pub struct SqliteAuditLogger {
    db: SqliteDb,
}

impl SqliteAuditLogger {
    pub fn new(db: SqliteDb) -> Self {
        Self { db }
    }
}

#[async_trait]
impl AuditLoggerPort for SqliteAuditLogger {
    async fn log(&self, action: &str, target: &str) -> Result<(), DomainError> {
        sqlx::query("INSERT INTO audit_log (timestamp, action, target) VALUES (datetime('now'), ?, ?)")
            .bind(action)
            .bind(target)
            .execute(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;
        tracing::info!(action = action, target = target, "Audit log");
        Ok(())
    }

    async fn log_with_details(
        &self,
        action: &str,
        target: &str,
        details: &str,
    ) -> Result<(), DomainError> {
        sqlx::query("INSERT INTO audit_log (timestamp, action, target, details) VALUES (datetime('now'), ?, ?, ?)")
            .bind(action)
            .bind(target)
            .bind(details)
            .execute(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;
        tracing::info!(action = action, target = target, details = details, "Audit log");
        Ok(())
    }

    async fn search(&self, query: AuditQuery) -> Result<Vec<AuditEntry>, DomainError> {
        let mut sql = String::from("SELECT * FROM audit_log WHERE 1=1");
        let mut binds: Vec<String> = Vec::new();

        if let Some(ref action) = query.action_filter {
            sql.push_str(" AND action LIKE ?");
            binds.push(format!("%{}%", action));
        }
        if let Some(ref target) = query.target_filter {
            sql.push_str(" AND target LIKE ?");
            binds.push(format!("%{}%", target));
        }
        if let Some(since) = query.since {
            sql.push_str(" AND timestamp >= ?");
            binds.push(since.to_rfc3339());
        }
        if let Some(until) = query.until {
            sql.push_str(" AND timestamp <= ?");
            binds.push(until.to_rfc3339());
        }

        sql.push_str(" ORDER BY timestamp DESC LIMIT ? OFFSET ?");

        let mut q = sqlx::query(&sql);
        for b in &binds {
            q = q.bind(b);
        }
        q = q.bind(query.limit as i64).bind(query.offset as i64);

        let rows = q
            .fetch_all(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        let entries = rows
            .iter()
            .map(|row| {
                let ts_str: String = row.get("timestamp");
                AuditEntry {
                    id: row.get("id"),
                    timestamp: chrono::DateTime::parse_from_rfc3339(&ts_str)
                        .map(|dt| dt.with_timezone(&chrono::Utc))
                        .unwrap_or_else(|_| chrono::Utc::now()),
                    action: row.get("action"),
                    target: row.get("target"),
                    details: row.get("details"),
                }
            })
            .collect();

        Ok(entries)
    }
}
