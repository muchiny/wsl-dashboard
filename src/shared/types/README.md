# 📐 Types

> TypeScript interfaces and type aliases mirroring the Rust backend DTOs.

---

## 📂 `distro.ts`

| Type | Key Fields |
|------|------------|
| `Distro` | `name: string`, `state: DistroState`, `wsl_version: number`, `is_default: boolean`, `base_path: string \| null`, `vhdx_size_bytes: number \| null`, `last_seen: string` |
| `DistroState` | `"Running"` \| `"Stopped"` \| `"Installing"` \| `"Converting"` \| `"Uninstalling"` |

## 📂 `snapshot.ts`

| Type | Key Fields |
|------|------------|
| `Snapshot` | `id: string`, `distro_name: string`, `name: string`, `description: string \| null`, `snapshot_type: "full" \| "incremental"`, `format: string`, `file_path: string`, `file_size_bytes: number`, `parent_id: string \| null`, `created_at: string`, `status: string` |
| `CreateSnapshotArgs` | `distro_name: string`, `name: string`, `description?: string`, `format?: "tar" \| "vhdx"`, `output_dir: string` |
| `RestoreSnapshotArgs` | `snapshot_id: string`, `mode: "clone" \| "overwrite"`, `new_name?: string`, `install_location?: string` |

## 📂 `monitoring.ts`

| Type | Key Fields |
|------|------------|
| `SystemMetrics` | `distro_name`, `timestamp`, `cpu: CpuMetrics`, `memory: MemoryMetrics`, `disk: DiskMetrics`, `network: NetworkMetrics` |
| `CpuMetrics` | `usage_percent`, `per_core: number[]`, `load_average: [number, number, number]` |
| `MemoryMetrics` | `total_bytes`, `used_bytes`, `available_bytes`, `cached_bytes`, `swap_total_bytes`, `swap_used_bytes` |
| `DiskMetrics` | `total_bytes`, `used_bytes`, `available_bytes`, `usage_percent` |
| `NetworkMetrics` | `interfaces: InterfaceStats[]` |
| `InterfaceStats` | `name`, `rx_bytes`, `tx_bytes`, `rx_packets`, `tx_packets` |
| `TimeRange` | `"live"` \| `"1h"` \| `"6h"` \| `"24h"` |
| `MetricsHistoryPoint` | `timestamp`, `cpu_avg`, `cpu_min?`, `cpu_max?`, `mem_used_bytes`, `mem_total_bytes`, `disk_usage_percent`, `net_rx_rate`, `net_tx_rate` |
| `MetricsHistoryResponse` | `distro_name`, `granularity: "raw" \| "1m"`, `points: MetricsHistoryPoint[]` |
| `AlertType` | `"cpu"` \| `"memory"` \| `"disk"` |
| `AlertThreshold` | `alert_type: AlertType`, `threshold_percent: number`, `enabled: boolean` |
| `AlertRecord` | `id`, `distro_name`, `alert_type`, `threshold`, `actual_value`, `timestamp`, `acknowledged` |

---

> 👀 See also: [shared/](../README.md) · [api/](../api/README.md) · [stores/](../stores/README.md)
