# 🗄️ SQLite Persistence

> Durable storage for snapshots, audit logs, metrics, alerts, and port forwarding rules via SQLite (sqlx).

---

## 🗃️ Database Schema

```mermaid
erDiagram
    snapshots {
        TEXT id PK
        TEXT distro_name
        TEXT name
        TEXT description
        TEXT snapshot_type
        TEXT format
        TEXT file_path
        INTEGER file_size
        TEXT parent_id FK
        TEXT created_at
        TEXT status
    }

    audit_log {
        INTEGER id PK
        TEXT timestamp
        TEXT action
        TEXT target
        TEXT details
    }

    metrics_raw {
        INTEGER id PK
        TEXT distro_name
        TEXT timestamp
        REAL cpu_usage_percent
        REAL load_avg_1
        REAL load_avg_5
        REAL load_avg_15
        INTEGER mem_total_bytes
        INTEGER mem_used_bytes
        INTEGER mem_available_bytes
        INTEGER mem_cached_bytes
        INTEGER swap_total_bytes
        INTEGER swap_used_bytes
        INTEGER disk_total_bytes
        INTEGER disk_used_bytes
        INTEGER disk_available_bytes
        REAL disk_usage_percent
        INTEGER net_rx_bytes
        INTEGER net_tx_bytes
    }

    metrics_aggregated {
        INTEGER id PK
        TEXT distro_name
        TEXT period_start
        TEXT period_end
        INTEGER sample_count
        REAL cpu_min
        REAL cpu_avg
        REAL cpu_max
        INTEGER mem_used_min
        INTEGER mem_used_avg
        INTEGER mem_used_max
        INTEGER mem_total
        REAL disk_min
        REAL disk_avg
        REAL disk_max
        INTEGER net_rx_total
        INTEGER net_tx_total
        INTEGER net_rx_max_rate
        INTEGER net_tx_max_rate
    }

    alert_log {
        INTEGER id PK
        TEXT distro_name
        TEXT alert_type
        REAL threshold
        REAL actual_value
        TEXT timestamp
        INTEGER acknowledged
    }

    port_forwarding_rules {
        TEXT id PK
        TEXT distro_name
        INTEGER wsl_port
        INTEGER host_port
        TEXT protocol
        INTEGER enabled
        TEXT created_at
    }

    snapshots ||--o| snapshots : "parent_id"
```

## 📁 Files

| File | Description |
|------|-------------|
| `adapter.rs` | **SqliteDb** (connection pool), **SqliteSnapshotRepository**, and **SqliteAuditLogger** — core persistence with WAL mode, mmap, and `busy_timeout`. Runs migrations on init. |
| `metrics_repository.rs` | **SqliteMetricsRepository** — stores raw time-series data, queries raw/aggregated metrics, aggregates into 1-minute buckets via `INSERT...SELECT`, and purges old data. |
| `alert_repository.rs` | **SqliteAlertRepository** — records threshold alerts (CPU/Memory/Disk), retrieves recent alerts per distro, supports acknowledgement and purging. |
| `port_forwarding_repository.rs` | **SqlitePortForwardingRepository** — CRUD for port forwarding rules with a `UNIQUE(host_port, protocol)` constraint. |
| `mod.rs` | Module re-exports and `SqlxResultExt` trait for converting `sqlx::Error` to `DomainError`. |
| `migrations/001_initial.sql` | Creates `snapshots` and `audit_log` tables with indexes. |
| `migrations/002_metrics.sql` | Creates `metrics_raw`, `metrics_aggregated`, and `alert_log` tables with time-series indexes. |
| `migrations/003_port_forwarding.sql` | Creates `port_forwarding_rules` table. |

## 🔌 Port Implementations

| Repository | Port Implemented |
|------------|------------------|
| `SqliteSnapshotRepository` | `SnapshotRepositoryPort` |
| `SqliteAuditLogger` | `AuditLoggerPort` |
| `SqliteMetricsRepository` | `MetricsRepositoryPort` |
| `SqliteAlertRepository` | `AlertingPort` |
| `SqlitePortForwardingRepository` | `PortForwardRulesRepository` |

## ⚙️ Configuration

- **Journal mode**: WAL (Write-Ahead Logging)
- **Synchronous**: Normal
- **Busy timeout**: 5 seconds
- **mmap size**: 256 MB
- **Cache size**: 8000 pages
- **Max connections**: 2
- **Metrics retention**: raw ~1h, aggregated 1-min ~24h, alerts ~24h

---

> 👀 See also: [`domain/ports/`](../../domain/ports/) for the port traits these repositories implement.
