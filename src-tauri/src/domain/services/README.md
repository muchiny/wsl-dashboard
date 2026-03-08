# ⚙️ Services

> Domain services that orchestrate business logic across ports and entities.

---

## 🔄 DistroService Flow

```mermaid
sequenceDiagram
    participant Caller as 📋 Command Handler
    participant Service as ⚙️ DistroService
    participant Port as 🔗 WslManagerPort
    participant Adapter as 🔌 WslCliAdapter

    Caller->>Service: start(name)
    Service->>Port: get_distro(name)
    Port->>Adapter: wsl.exe --list --verbose
    Adapter-->>Port: Distro { state: Stopped }
    Port-->>Service: Ok(distro)
    Note over Service: Validate: state != Running
    Service->>Port: start_distro(name)
    Port->>Adapter: wsl.exe -d {name} -- echo ok
    Adapter-->>Port: Ok(())
    Port-->>Service: Ok(())
    Service-->>Caller: Ok(())
```

## 📊 MetricsCollector Flow

```mermaid
sequenceDiagram
    participant Timer as ⏱️ Tokio Interval (2s)
    participant Collector as ⚙️ MetricsCollector
    participant WSL as 🔗 WslManagerPort
    participant Monitor as 🔗 MonitoringProviderPort
    participant Repo as 🔗 MetricsRepositoryPort
    participant Alert as 🔗 AlertingPort
    participant UI as 🎯 Tauri Events

    Timer->>Collector: tick
    Collector->>WSL: list_distros() [cached 10s]
    WSL-->>Collector: running distros
    loop Each running distro (parallel)
        Collector->>Monitor: get_all_metrics(distro)
        Monitor-->>Collector: (cpu, mem, disk, net)
        Collector->>Repo: store_raw(metrics)
        Collector->>UI: emit("system-metrics", metrics)
    end
    Collector->>Collector: check_alerts(thresholds)
    opt Threshold exceeded + cooldown expired
        Collector->>Alert: record_alert(distro, type, threshold, value)
        Collector->>UI: emit("alert-triggered", alert)
        Collector->>UI: desktop notification
    end
```

## 📁 File Inventory

| File | Service | Interval | Dependencies |
|------|---------|----------|-------------|
| `distro_service.rs` | `DistroService` | On-demand | `WslManagerPort` |
| `metrics_collector.rs` | `MetricsCollector` | 2 seconds | `MonitoringProviderPort`, `MetricsRepositoryPort`, `AlertingPort`, `WslManagerPort` |
| `metrics_aggregator.rs` | `MetricsAggregator` | 60 seconds | `MetricsRepositoryPort`, `AlertingPort` |
| `mod.rs` | Module declarations | -- | -- |

## 📋 Business Rules

### DistroService
- **start**: Rejects if distro is already `Running` (`DistroAlreadyRunning` error)
- **stop**: Rejects if distro is not `Running` (`DistroNotRunning` error)
- **restart**: Terminates first if running, then starts (idempotent for stopped distros)

### MetricsCollector
- Collects from all running distros in **parallel** via `futures::join_all`
- Caches distro list for **10 seconds** to avoid calling `wsl.exe --list` every 2s
- Alert cooldown of **5 minutes** per (distro, alert_type) pair to prevent notification spam
- Sends desktop notifications via `tauri-plugin-notification` on threshold breach

### MetricsAggregator
- Aggregates raw metrics into **1-minute buckets** (min/avg/max)
- Aggregation window: 2 to 62 minutes ago (ensures complete buckets)
- **Retention policy**:
  - Raw metrics: **1 hour**
  - Aggregated metrics: **24 hours**
  - Alerts: **24 hours**

---

> 👀 See also: [entities/](../entities/) | [ports/](../ports/) | [value_objects/](../value_objects/) | [💎 domain/](../)
