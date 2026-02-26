CREATE TABLE IF NOT EXISTS port_forwarding_rules (
    id TEXT PRIMARY KEY,
    distro_name TEXT NOT NULL,
    wsl_port INTEGER NOT NULL,
    host_port INTEGER NOT NULL,
    protocol TEXT NOT NULL DEFAULT 'tcp',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(host_port, protocol)
);
