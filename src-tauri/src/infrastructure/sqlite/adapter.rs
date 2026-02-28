use async_trait::async_trait;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use std::str::FromStr;

use super::SqlxResultExt;
use crate::domain::entities::snapshot::{ExportFormat, Snapshot, SnapshotStatus, SnapshotType};
use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::{AuditEntry, AuditLoggerPort, AuditQuery};
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::value_objects::{DistroName, MemorySize, SnapshotId};

/// Shared SQLite connection pool.
#[derive(Clone)]
pub struct SqliteDb {
    pub(crate) pool: SqlitePool,
}

impl SqliteDb {
    pub async fn new(db_path: &str) -> Result<Self, DomainError> {
        let options = SqliteConnectOptions::from_str(db_path)
            .db_err()?
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .busy_timeout(std::time::Duration::from_secs(5))
            .pragma("temp_store", "MEMORY")
            .pragma("mmap_size", "268435456")
            .pragma("cache_size", "-8000");

        let pool = SqlitePoolOptions::new()
            .max_connections(2)
            .connect_with(options)
            .await
            .db_err()?;

        // Run migrations
        sqlx::query(include_str!("migrations/001_initial.sql"))
            .execute(&pool)
            .await
            .db_err()?;

        sqlx::query(include_str!("migrations/002_metrics.sql"))
            .execute(&pool)
            .await
            .db_err()?;

        sqlx::query(include_str!("migrations/003_port_forwarding.sql"))
            .execute(&pool)
            .await
            .db_err()?;

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
            "vhdx" => ExportFormat::Vhd,
            _ => ExportFormat::Tar, // "tar" + legacy "tar.gz"/"tar.xz" (always plain tar)
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
        .db_err()?;

        Ok(())
    }

    async fn list_by_distro(&self, distro: &DistroName) -> Result<Vec<Snapshot>, DomainError> {
        let rows =
            sqlx::query("SELECT * FROM snapshots WHERE distro_name = ? ORDER BY created_at DESC")
                .bind(distro.as_str())
                .fetch_all(&self.db.pool)
                .await
                .db_err()?;

        rows.iter().map(|r| self.row_to_snapshot(r)).collect()
    }

    async fn list_all(&self) -> Result<Vec<Snapshot>, DomainError> {
        let rows = sqlx::query("SELECT * FROM snapshots ORDER BY created_at DESC")
            .fetch_all(&self.db.pool)
            .await
            .db_err()?;

        rows.iter().map(|r| self.row_to_snapshot(r)).collect()
    }

    async fn get_by_id(&self, id: &SnapshotId) -> Result<Snapshot, DomainError> {
        let row = sqlx::query("SELECT * FROM snapshots WHERE id = ?")
            .bind(id.as_str())
            .fetch_optional(&self.db.pool)
            .await
            .db_err()?
            .ok_or_else(|| DomainError::SnapshotNotFound(id.to_string()))?;

        self.row_to_snapshot(&row)
    }

    async fn delete(&self, id: &SnapshotId) -> Result<(), DomainError> {
        sqlx::query("DELETE FROM snapshots WHERE id = ?")
            .bind(id.as_str())
            .execute(&self.db.pool)
            .await
            .db_err()?;
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
        sqlx::query(
            "INSERT INTO audit_log (timestamp, action, target) VALUES (datetime('now'), ?, ?)",
        )
        .bind(action)
        .bind(target)
        .execute(&self.db.pool)
        .await
        .db_err()?;
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
            .db_err()?;
        tracing::info!(
            action = action,
            target = target,
            details = details,
            "Audit log"
        );
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

        let rows = q.fetch_all(&self.db.pool).await.db_err()?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::snapshot::{ExportFormat, Snapshot, SnapshotStatus, SnapshotType};
    use crate::domain::ports::audit_logger::{AuditLoggerPort, AuditQuery};
    use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
    use crate::domain::value_objects::{DistroName, MemorySize, SnapshotId};

    /// Helper: create an in-memory SqliteDb for testing.
    async fn test_db() -> SqliteDb {
        SqliteDb::new("sqlite::memory:").await.unwrap()
    }

    /// Helper: build a Snapshot with sensible defaults. Accepts overrides for common fields.
    fn make_snapshot(
        id: &str,
        distro: &str,
        name: &str,
        created_at: chrono::DateTime<chrono::Utc>,
    ) -> Snapshot {
        Snapshot {
            id: SnapshotId::from_string(id.to_string()),
            distro_name: DistroName::new(distro).unwrap(),
            name: name.to_string(),
            description: Some(format!("Description for {}", name)),
            snapshot_type: SnapshotType::Full,
            format: ExportFormat::Tar,
            file_path: format!("/tmp/{}.tar", id),
            file_size: MemorySize::from_bytes(1024),
            parent_id: None,
            created_at,
            status: SnapshotStatus::Completed,
        }
    }

    // ---- SqliteDb tests ----

    #[tokio::test]
    async fn test_sqlite_db_new_creates_tables_successfully() {
        let db = test_db().await;

        // Verify the snapshots table exists by querying it
        let result = sqlx::query("SELECT COUNT(*) as cnt FROM snapshots")
            .fetch_one(&db.pool)
            .await;
        assert!(result.is_ok(), "snapshots table should exist");

        // Verify the audit_log table exists
        let result = sqlx::query("SELECT COUNT(*) as cnt FROM audit_log")
            .fetch_one(&db.pool)
            .await;
        assert!(result.is_ok(), "audit_log table should exist");
    }

    // ---- SqliteSnapshotRepository::save tests ----

    #[tokio::test]
    async fn test_save_creates_new_snapshot() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let snapshot = make_snapshot("snap-001", "Ubuntu", "backup-1", chrono::Utc::now());
        let result = repo.save(&snapshot).await;
        assert!(result.is_ok());

        // Verify it was persisted
        let retrieved = repo
            .get_by_id(&SnapshotId::from_string("snap-001".to_string()))
            .await
            .unwrap();
        assert_eq!(retrieved.name, "backup-1");
        assert_eq!(retrieved.distro_name.as_str(), "Ubuntu");
        assert_eq!(retrieved.file_path, "/tmp/snap-001.tar");
        assert_eq!(retrieved.file_size.bytes(), 1024);
    }

    #[tokio::test]
    async fn test_save_upserts_existing_snapshot() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let now = chrono::Utc::now();
        let snapshot = make_snapshot("snap-upsert", "Ubuntu", "original-name", now);
        repo.save(&snapshot).await.unwrap();

        // Update the snapshot with the same ID but different data
        let updated = Snapshot {
            name: "updated-name".to_string(),
            description: Some("updated description".to_string()),
            file_size: MemorySize::from_bytes(2048),
            status: SnapshotStatus::Failed("disk full".to_string()),
            ..snapshot
        };
        let result = repo.save(&updated).await;
        assert!(result.is_ok());

        // Verify the update took effect and there's only one row
        let retrieved = repo
            .get_by_id(&SnapshotId::from_string("snap-upsert".to_string()))
            .await
            .unwrap();
        assert_eq!(retrieved.name, "updated-name");
        assert_eq!(
            retrieved.description,
            Some("updated description".to_string())
        );
        assert_eq!(retrieved.file_size.bytes(), 2048);
        match retrieved.status {
            SnapshotStatus::Failed(reason) => assert_eq!(reason, "disk full"),
            other => panic!("Expected Failed status, got: {:?}", other),
        }

        // Confirm only one snapshot exists (upsert, not duplicate insert)
        let all = repo.list_all().await.unwrap();
        assert_eq!(all.len(), 1);
    }

    // ---- SqliteSnapshotRepository::list_all tests ----

    #[tokio::test]
    async fn test_list_all_returns_snapshots_ordered_by_created_at_desc() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let t1 = chrono::Utc::now() - chrono::Duration::hours(3);
        let t2 = chrono::Utc::now() - chrono::Duration::hours(2);
        let t3 = chrono::Utc::now() - chrono::Duration::hours(1);

        // Insert in non-chronological order
        repo.save(&make_snapshot("snap-a", "Ubuntu", "oldest", t1))
            .await
            .unwrap();
        repo.save(&make_snapshot("snap-c", "Debian", "newest", t3))
            .await
            .unwrap();
        repo.save(&make_snapshot("snap-b", "Fedora", "middle", t2))
            .await
            .unwrap();

        let all = repo.list_all().await.unwrap();
        assert_eq!(all.len(), 3);
        // Ordered by created_at DESC: newest first
        assert_eq!(all[0].name, "newest");
        assert_eq!(all[1].name, "middle");
        assert_eq!(all[2].name, "oldest");
    }

    #[tokio::test]
    async fn test_list_all_returns_empty_when_no_snapshots() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let all = repo.list_all().await.unwrap();
        assert!(all.is_empty());
    }

    // ---- SqliteSnapshotRepository::list_by_distro tests ----

    #[tokio::test]
    async fn test_list_by_distro_filters_correctly() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let now = chrono::Utc::now();
        repo.save(&make_snapshot("s1", "Ubuntu", "ubuntu-snap-1", now))
            .await
            .unwrap();
        repo.save(&make_snapshot(
            "s2",
            "Ubuntu",
            "ubuntu-snap-2",
            now - chrono::Duration::hours(1),
        ))
        .await
        .unwrap();
        repo.save(&make_snapshot("s3", "Debian", "debian-snap-1", now))
            .await
            .unwrap();

        let ubuntu = DistroName::new("Ubuntu").unwrap();
        let ubuntu_snaps = repo.list_by_distro(&ubuntu).await.unwrap();
        assert_eq!(ubuntu_snaps.len(), 2);
        for snap in &ubuntu_snaps {
            assert_eq!(snap.distro_name.as_str(), "Ubuntu");
        }
        // Should be ordered by created_at DESC
        assert_eq!(ubuntu_snaps[0].name, "ubuntu-snap-1");
        assert_eq!(ubuntu_snaps[1].name, "ubuntu-snap-2");

        let debian = DistroName::new("Debian").unwrap();
        let debian_snaps = repo.list_by_distro(&debian).await.unwrap();
        assert_eq!(debian_snaps.len(), 1);
        assert_eq!(debian_snaps[0].distro_name.as_str(), "Debian");
    }

    #[tokio::test]
    async fn test_list_by_distro_returns_empty_for_unknown_distro() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        repo.save(&make_snapshot("s1", "Ubuntu", "snap", chrono::Utc::now()))
            .await
            .unwrap();

        let arch = DistroName::new("Arch").unwrap();
        let snaps = repo.list_by_distro(&arch).await.unwrap();
        assert!(snaps.is_empty());
    }

    // ---- SqliteSnapshotRepository::get_by_id tests ----

    #[tokio::test]
    async fn test_get_by_id_returns_correct_snapshot() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let now = chrono::Utc::now();
        let snapshot = Snapshot {
            id: SnapshotId::from_string("specific-id".to_string()),
            distro_name: DistroName::new("Fedora").unwrap(),
            name: "fedora-backup".to_string(),
            description: None,
            snapshot_type: SnapshotType::PseudoIncremental,
            format: ExportFormat::Tar,
            file_path: "/backups/fedora.tar".to_string(),
            file_size: MemorySize::from_bytes(5_000_000),
            parent_id: None,
            created_at: now,
            status: SnapshotStatus::InProgress,
        };
        repo.save(&snapshot).await.unwrap();

        let retrieved = repo
            .get_by_id(&SnapshotId::from_string("specific-id".to_string()))
            .await
            .unwrap();

        assert_eq!(retrieved.id.as_str(), "specific-id");
        assert_eq!(retrieved.distro_name.as_str(), "Fedora");
        assert_eq!(retrieved.name, "fedora-backup");
        assert_eq!(retrieved.description, None);
        assert_eq!(retrieved.file_path, "/backups/fedora.tar");
        assert_eq!(retrieved.file_size.bytes(), 5_000_000);
        match retrieved.snapshot_type {
            SnapshotType::PseudoIncremental => {}
            other => panic!("Expected PseudoIncremental, got: {:?}", other),
        }
        match retrieved.format {
            ExportFormat::Tar => {}
            other => panic!("Expected Tar, got: {:?}", other),
        }
        match retrieved.status {
            SnapshotStatus::InProgress => {}
            other => panic!("Expected InProgress, got: {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_get_by_id_returns_error_for_nonexistent_id() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let result = repo
            .get_by_id(&SnapshotId::from_string("does-not-exist".to_string()))
            .await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        let msg = err.to_string();
        assert!(
            msg.contains("Snapshot not found"),
            "Expected SnapshotNotFound error, got: {}",
            msg
        );
    }

    // ---- SqliteSnapshotRepository::delete tests ----

    #[tokio::test]
    async fn test_delete_removes_snapshot() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        let snapshot = make_snapshot("del-me", "Ubuntu", "to-delete", chrono::Utc::now());
        repo.save(&snapshot).await.unwrap();

        // Confirm it exists
        let retrieved = repo
            .get_by_id(&SnapshotId::from_string("del-me".to_string()))
            .await;
        assert!(retrieved.is_ok());

        // Delete it
        repo.delete(&SnapshotId::from_string("del-me".to_string()))
            .await
            .unwrap();

        // Confirm it's gone
        let result = repo
            .get_by_id(&SnapshotId::from_string("del-me".to_string()))
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete_nonexistent_snapshot_does_not_error() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);

        // Deleting a non-existent row should succeed silently (DELETE WHERE with no match)
        let result = repo
            .delete(&SnapshotId::from_string("ghost".to_string()))
            .await;
        assert!(result.is_ok());
    }

    // ---- Snapshot round-trip: format and status variants ----

    #[tokio::test]
    async fn test_save_and_retrieve_all_format_variants() {
        let db = test_db().await;
        let repo = SqliteSnapshotRepository::new(db);
        let now = chrono::Utc::now();

        let formats = vec![
            ("fmt-tar", ExportFormat::Tar),
            ("fmt-vhd", ExportFormat::Vhd),
        ];

        for (id, format) in &formats {
            let snap = Snapshot {
                id: SnapshotId::from_string(id.to_string()),
                distro_name: DistroName::new("Ubuntu").unwrap(),
                name: id.to_string(),
                description: None,
                snapshot_type: SnapshotType::Full,
                format: format.clone(),
                file_path: format!("/tmp/{}", id),
                file_size: MemorySize::from_bytes(100),
                parent_id: None,
                created_at: now,
                status: SnapshotStatus::Completed,
            };
            repo.save(&snap).await.unwrap();
        }

        // Verify each format round-trips correctly
        let retrieved = repo
            .get_by_id(&SnapshotId::from_string("fmt-tar".to_string()))
            .await
            .unwrap();
        assert_eq!(retrieved.format.extension(), "tar");

        let retrieved = repo
            .get_by_id(&SnapshotId::from_string("fmt-vhd".to_string()))
            .await
            .unwrap();
        assert_eq!(retrieved.format.extension(), "vhdx");

        // Legacy "tar.gz"/"tar.xz" values in DB should deserialize as Tar
        // (wsl --export always produced plain tar regardless of extension)
        sqlx::query("INSERT INTO snapshots (id, distro_name, name, description, snapshot_type, format, file_path, file_size, parent_id, created_at, status) VALUES (?, ?, ?, NULL, 'full', 'tar.gz', '/tmp/legacy', 100, NULL, ?, 'completed')")
            .bind("fmt-legacy-gz")
            .bind("Ubuntu")
            .bind("legacy-gz")
            .bind(now.to_rfc3339())
            .execute(&repo.db.pool)
            .await
            .unwrap();

        let retrieved = repo
            .get_by_id(&SnapshotId::from_string("fmt-legacy-gz".to_string()))
            .await
            .unwrap();
        assert_eq!(retrieved.format.extension(), "tar");
    }

    // ---- SqliteAuditLogger tests ----

    #[tokio::test]
    async fn test_audit_log_writes_entry() {
        let db = test_db().await;
        let logger = SqliteAuditLogger::new(db);

        let result = logger.log("start_distro", "Ubuntu").await;
        assert!(result.is_ok());

        // Verify the entry was written
        let entries = logger
            .search(AuditQuery {
                action_filter: None,
                target_filter: None,
                since: None,
                until: None,
                limit: 100,
                offset: 0,
            })
            .await
            .unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].action, "start_distro");
        assert_eq!(entries[0].target, "Ubuntu");
        assert_eq!(entries[0].details, None);
    }

    #[tokio::test]
    async fn test_audit_log_with_details() {
        let db = test_db().await;
        let logger = SqliteAuditLogger::new(db);

        logger
            .log_with_details("snapshot_create", "Debian", "Created full backup")
            .await
            .unwrap();

        let entries = logger
            .search(AuditQuery {
                action_filter: None,
                target_filter: None,
                since: None,
                until: None,
                limit: 100,
                offset: 0,
            })
            .await
            .unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].action, "snapshot_create");
        assert_eq!(entries[0].target, "Debian");
        assert_eq!(entries[0].details, Some("Created full backup".to_string()));
    }

    #[tokio::test]
    async fn test_audit_get_logs_returns_entries_ordered_desc() {
        let db = test_db().await;
        let logger = SqliteAuditLogger::new(db);

        logger.log("action_1", "target_a").await.unwrap();
        logger.log("action_2", "target_b").await.unwrap();
        logger.log("action_3", "target_c").await.unwrap();

        let entries = logger
            .search(AuditQuery {
                action_filter: None,
                target_filter: None,
                since: None,
                until: None,
                limit: 100,
                offset: 0,
            })
            .await
            .unwrap();
        assert_eq!(entries.len(), 3);
        // ORDER BY timestamp DESC: most recent first
        assert_eq!(entries[0].action, "action_3");
        assert_eq!(entries[1].action, "action_2");
        assert_eq!(entries[2].action, "action_1");
    }

    #[tokio::test]
    async fn test_audit_search_with_action_filter() {
        let db = test_db().await;
        let logger = SqliteAuditLogger::new(db);

        logger.log("start_distro", "Ubuntu").await.unwrap();
        logger.log("stop_distro", "Ubuntu").await.unwrap();
        logger.log("start_distro", "Debian").await.unwrap();

        let entries = logger
            .search(AuditQuery {
                action_filter: Some("start".to_string()),
                target_filter: None,
                since: None,
                until: None,
                limit: 100,
                offset: 0,
            })
            .await
            .unwrap();
        assert_eq!(entries.len(), 2);
        for entry in &entries {
            assert!(entry.action.contains("start"));
        }
    }

    #[tokio::test]
    async fn test_audit_search_with_target_filter() {
        let db = test_db().await;
        let logger = SqliteAuditLogger::new(db);

        logger.log("start_distro", "Ubuntu").await.unwrap();
        logger.log("stop_distro", "Debian").await.unwrap();
        logger.log("restart_distro", "Ubuntu").await.unwrap();

        let entries = logger
            .search(AuditQuery {
                action_filter: None,
                target_filter: Some("Ubuntu".to_string()),
                since: None,
                until: None,
                limit: 100,
                offset: 0,
            })
            .await
            .unwrap();
        assert_eq!(entries.len(), 2);
        for entry in &entries {
            assert_eq!(entry.target, "Ubuntu");
        }
    }

    #[tokio::test]
    async fn test_audit_search_with_limit_and_offset() {
        let db = test_db().await;
        let logger = SqliteAuditLogger::new(db);

        for i in 0..5 {
            logger
                .log(&format!("action_{}", i), "target")
                .await
                .unwrap();
        }

        // Limit to 2
        let entries = logger
            .search(AuditQuery {
                action_filter: None,
                target_filter: None,
                since: None,
                until: None,
                limit: 2,
                offset: 0,
            })
            .await
            .unwrap();
        assert_eq!(entries.len(), 2);

        // Offset by 3, should get 2 remaining (indices 3 and 4 from the end)
        let entries = logger
            .search(AuditQuery {
                action_filter: None,
                target_filter: None,
                since: None,
                until: None,
                limit: 10,
                offset: 3,
            })
            .await
            .unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[tokio::test]
    async fn test_audit_search_returns_empty_when_no_entries() {
        let db = test_db().await;
        let logger = SqliteAuditLogger::new(db);

        let entries = logger
            .search(AuditQuery {
                action_filter: None,
                target_filter: None,
                since: None,
                until: None,
                limit: 100,
                offset: 0,
            })
            .await
            .unwrap();
        assert!(entries.is_empty());
    }
}
