# 🧩 Features

> 8 self-contained feature slices — each encapsulates a complete application capability.

---

## 🎯 Principle

Each feature is a **vertical slice** that contains everything it needs: API calls, UI components, and specific hooks. Features are **independent** from each other — they only import from `shared/`.

---

## 📁 Internal Convention

Each feature follows this structure:

```
feature-name/
├── api/
│   ├── queries.ts       # TanStack Query hooks (read)
│   └── mutations.ts     # TanStack Query hooks (write)
├── ui/
│   ├── component-a.tsx  # React components
│   └── component-b.tsx
└── hooks/               # (optional) Feature-specific hooks
    └── use-xxx.ts
```

---

## 📊 Feature Inventory

| Feature | Description | Queries | Mutations | UI Components |
|---|---|---|---|---|
| 📦 `distro-list` | WSL distribution management | `useDistros`, `useDistroDetails` | `useStartDistro`, `useStopDistro`, `useRestartDistro`, `useShutdownAll` | `distro-list`, `distro-card` |
| 💾 `snapshot-list` | Snapshot creation and restoration | `useSnapshots` | `useCreateSnapshot`, `useDeleteSnapshot`, `useRestoreSnapshot` | `snapshot-list`, `snapshot-card`, `create-snapshot-dialog`, `restore-snapshot-dialog` |
| 📈 `monitoring-dashboard` | Real-time system metrics | `useSystemMetrics`, `useProcesses` | — | `cpu-chart`, `memory-chart`, `network-chart`, `disk-gauge`, `process-table` |
| 🐳 `docker-containers` | Docker containers and images | `useDockerStatus` | `useStartContainer`, `useStopContainer` | `container-list`, `image-list` |
| 🔧 `iac-integrations` | IaC tools + Kubernetes | `useIacTools`, `useK8sInfo` | — | `toolset-panel`, `k8s-panel` |
| ⚙️ `wsl-config` | .wslconfig editor + VHDX | `useWslConfig` | `useUpdateWslConfig`, `useCompactVhdx` | `wslconfig-editor`, `vhdx-compact-panel` |
| 📝 `audit-log` | Searchable audit trail | `useAuditLog` | — | `audit-log-viewer` |
| 📡 `distro-events` | Tauri event listener | — | — | — (hook only) |

---

## 📦 `distro-list` — Distribution Management

**Purpose**: List, start, stop, restart WSL distributions.

```
distro-list/
├── api/
│   ├── queries.ts       # useDistros (10s refetch), useDistroDetails
│   └── mutations.ts     # useStartDistro, useStopDistro, useRestartDistro, useShutdownAll
└── ui/
    ├── distro-list.tsx  # Grid of DistroCards with loading/error states
    └── distro-card.tsx  # Card with state badge, default indicator, action buttons
```

**Query Key Pattern**: `["distros", "list"]`, `["distros", "detail", name]`

Mutations **automatically invalidate** the distro cache after success.

---

## 💾 `snapshot-list` — Snapshots

**Purpose**: Create, list, delete and restore distribution snapshots.

```
snapshot-list/
├── api/
│   ├── queries.ts       # useSnapshots (filterable by distro)
│   └── mutations.ts     # useCreateSnapshot, useDeleteSnapshot, useRestoreSnapshot
└── ui/
    ├── snapshot-list.tsx          # Grid of SnapshotCards
    ├── snapshot-card.tsx          # Metadata (size, format, date, status)
    ├── create-snapshot-dialog.tsx # Modal: distro choice, name, format (tar/gz/xz/vhdx)
    └── restore-snapshot-dialog.tsx # Modal: clone or overwrite mode, install path
```

**Supported formats**: `tar`, `tar.gz`, `tar.xz`, `vhdx`
**Restore modes**: Clone (new name) or Overwrite (replaces existing)

---

## 📈 `monitoring-dashboard` — Real-Time Metrics

**Purpose**: Visualize CPU, memory, disk, network and processes in real-time.

```
monitoring-dashboard/
├── api/
│   └── queries.ts               # useSystemMetrics (2s), useProcesses (3s)
├── hooks/
│   └── use-metrics-history.ts   # Accumulates 60 points, computes network rates
└── ui/
    ├── cpu-chart.tsx            # Recharts Area chart + load average
    ├── memory-chart.tsx         # Recharts Area chart (%, usage)
    ├── network-chart.tsx        # Dual-area chart (RX/TX rates)
    ├── disk-gauge.tsx           # Color-coded progress bar
    └── process-table.tsx        # Sortable/filterable table (top 100)
```

**Special hook**: `useMetricsHistory()` maintains a **60-point sliding window** and computes **network rates** (bytes/s) from deltas.

---

## 🐳 `docker-containers` — Docker

**Purpose**: View and manage Docker containers and images in distributions.

```
docker-containers/
├── api/
│   ├── queries.ts       # useDockerStatus (5s refetch)
│   └── mutations.ts     # useStartContainer, useStopContainer
└── ui/
    ├── container-list.tsx  # List with state, ports, start/stop actions
    └── image-list.tsx      # Image table (repository, tag, size)
```

**Port mapping**: Format `0.0.0.0:8080->80/tcp`
**States**: running, paused, exited, created, restarting, dead

---

## 🔧 `iac-integrations` — Infrastructure as Code

**Purpose**: Detect installed IaC tools and display Kubernetes info.

```
iac-integrations/
├── api/
│   └── queries.ts       # useIacTools, useK8sInfo (enabled if kubectl detected)
└── ui/
    ├── toolset-panel.tsx  # 4-column grid: Ansible, kubectl, Terraform, Helm
    └── k8s-panel.tsx      # Cluster info, nodes, pod count
```

**Detection**: Runs `{tool} --version` for each tool. Displays version or "Not installed".

---

## ⚙️ `wsl-config` — WSL Configuration

**Purpose**: Edit global `.wslconfig` settings and optimize VHDX disks.

```
wsl-config/
├── api/
│   ├── queries.ts       # useWslConfig
│   └── mutations.ts     # useUpdateWslConfig, useCompactVhdx
└── ui/
    ├── wslconfig-editor.tsx    # Form: memory, processors, swap, nested virt, DNS...
    └── vhdx-compact-panel.tsx  # Button to enable sparse mode
```

**Editable settings**: memory, processors, swap, nestedVirtualization, dnsTunneling, autoProxy, etc.

---

## 📝 `audit-log` — Audit Trail

**Purpose**: Browse the full history of all actions performed.

```
audit-log/
├── api/
│   └── queries.ts             # useAuditLog (action/target filters, pagination)
└── ui/
    └── audit-log-viewer.tsx   # Searchable table: timestamp, action, target, details
```

**Filters**: By action (`distro.start`, `snapshot.create`...) and by target (distro name, snapshot UUID).

---

## 📡 `distro-events` — Real-Time Events

**Purpose**: Listen for distribution state changes via Tauri events.

```
distro-events/
└── hooks/
    └── use-distro-events.ts   # Tauri listener → TanStack Query cache invalidation
```

This hook is activated at the root layout level. When a distribution changes state (start/stop), it **automatically invalidates** the `distro-list` feature queries to force a refetch.

---

> 📖 See also: [🔧 Shared](../shared/README.md) · [📄 Pages](../pages/README.md) · [🧱 Widgets](../widgets/README.md)
