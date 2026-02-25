CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    distro_name TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_type TEXT NOT NULL,
    format TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    parent_id TEXT REFERENCES snapshots(id),
    created_at TEXT NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_snapshots_distro ON snapshots(distro_name);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
