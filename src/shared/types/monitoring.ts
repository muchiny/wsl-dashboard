export interface SystemMetrics {
  distro_name: string;
  timestamp: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  context_switches?: number;
  disk_io?: DiskIoMetrics;
  tcp_connections?: TcpConnectionMetrics;
  gpu?: GpuMetrics;
}

export interface DiskIoMetrics {
  read_bytes_per_sec: number;
  write_bytes_per_sec: number;
}

export interface TcpConnectionMetrics {
  established: number;
  time_wait: number;
  listen: number;
}

export interface GpuMetrics {
  utilization_percent: number | null;
  vram_used_bytes: number | null;
  vram_total_bytes: number | null;
}

export interface CpuMetrics {
  usage_percent: number;
  per_core: number[];
  load_average: [number, number, number];
}

export interface MemoryMetrics {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  cached_bytes: number;
  swap_total_bytes: number;
  swap_used_bytes: number;
}

export interface DiskMetrics {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  usage_percent: number;
}

export interface NetworkMetrics {
  interfaces: InterfaceStats[];
}

export interface InterfaceStats {
  name: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
}

// --- Historical metrics types ---

export type TimeRange = "live" | "1h" | "6h" | "24h";

export interface MetricsHistoryPoint {
  timestamp: string;
  cpu_avg: number;
  cpu_min?: number;
  cpu_max?: number;
  mem_used_bytes: number;
  mem_total_bytes: number;
  disk_usage_percent: number;
  net_rx_rate: number;
  net_tx_rate: number;
  swap_used_bytes?: number;
  swap_total_bytes?: number;
  context_switches?: number;
  disk_io_read_bytes?: number;
  disk_io_write_bytes?: number;
  tcp_established?: number;
  tcp_time_wait?: number;
  tcp_listen?: number;
  gpu_utilization?: number;
  gpu_vram_used?: number;
  gpu_vram_total?: number;
}

export interface MetricsHistoryResponse {
  distro_name: string;
  granularity: "raw" | "1m";
  points: MetricsHistoryPoint[];
}

// --- Alert types ---

export type AlertType = "cpu" | "memory" | "disk";

export interface AlertThreshold {
  alert_type: AlertType;
  threshold_percent: number;
  enabled: boolean;
}

export interface AlertRecord {
  id: number;
  distro_name: string;
  alert_type: AlertType;
  threshold: number;
  actual_value: number;
  timestamp: string;
  acknowledged: boolean;
}
