-- Metrics persistence: raw time-series + aggregated rollups + alert history
-- Retention: raw ~1h, aggregated 1min ~24h, alerts ~24h

CREATE TABLE IF NOT EXISTS metrics_raw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distro_name TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    -- CPU
    cpu_usage_percent REAL NOT NULL,
    load_avg_1 REAL NOT NULL,
    load_avg_5 REAL NOT NULL,
    load_avg_15 REAL NOT NULL,
    -- Memory
    mem_total_bytes INTEGER NOT NULL,
    mem_used_bytes INTEGER NOT NULL,
    mem_available_bytes INTEGER NOT NULL,
    mem_cached_bytes INTEGER NOT NULL,
    swap_total_bytes INTEGER NOT NULL,
    swap_used_bytes INTEGER NOT NULL,
    -- Disk
    disk_total_bytes INTEGER NOT NULL,
    disk_used_bytes INTEGER NOT NULL,
    disk_available_bytes INTEGER NOT NULL,
    disk_usage_percent REAL NOT NULL,
    -- Network (aggregated across all interfaces)
    net_rx_bytes INTEGER NOT NULL,
    net_tx_bytes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics_aggregated (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distro_name TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    sample_count INTEGER NOT NULL,
    -- CPU (min/avg/max)
    cpu_min REAL NOT NULL,
    cpu_avg REAL NOT NULL,
    cpu_max REAL NOT NULL,
    -- Memory used bytes (min/avg/max)
    mem_used_min INTEGER NOT NULL,
    mem_used_avg INTEGER NOT NULL,
    mem_used_max INTEGER NOT NULL,
    mem_total INTEGER NOT NULL,
    -- Disk usage percent (min/avg/max)
    disk_min REAL NOT NULL,
    disk_avg REAL NOT NULL,
    disk_max REAL NOT NULL,
    -- Network throughput
    net_rx_total INTEGER NOT NULL,
    net_tx_total INTEGER NOT NULL,
    net_rx_max_rate INTEGER NOT NULL,
    net_tx_max_rate INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distro_name TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    threshold REAL NOT NULL,
    actual_value REAL NOT NULL,
    timestamp TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0
);

-- Indexes for efficient time-series queries
CREATE INDEX IF NOT EXISTS idx_metrics_raw_distro_ts ON metrics_raw(distro_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_raw_ts ON metrics_raw(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_agg_distro_ts ON metrics_aggregated(distro_name, period_start);
CREATE INDEX IF NOT EXISTS idx_alert_log_distro_ts ON alert_log(distro_name, timestamp);
