-- Extended monitoring: disk I/O, TCP connections, context switches, GPU
ALTER TABLE metrics_raw ADD COLUMN context_switches INTEGER;
ALTER TABLE metrics_raw ADD COLUMN disk_io_read_bytes INTEGER;
ALTER TABLE metrics_raw ADD COLUMN disk_io_write_bytes INTEGER;
ALTER TABLE metrics_raw ADD COLUMN tcp_established INTEGER;
ALTER TABLE metrics_raw ADD COLUMN tcp_time_wait INTEGER;
ALTER TABLE metrics_raw ADD COLUMN tcp_listen INTEGER;
ALTER TABLE metrics_raw ADD COLUMN gpu_utilization REAL;
ALTER TABLE metrics_raw ADD COLUMN gpu_vram_used INTEGER;
ALTER TABLE metrics_raw ADD COLUMN gpu_vram_total INTEGER;
