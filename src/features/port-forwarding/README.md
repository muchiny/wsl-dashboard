# 🔀 Port Forwarding

> Manage WSL-to-host port mapping rules and discover listening ports inside distributions.

---

## 📁 Structure

```
port-forwarding/
├── api/
│   ├── queries.ts              # useListeningPorts, usePortForwardingRules
│   ├── queries.test.ts
│   ├── mutations.ts            # useAddPortForwarding, useRemovePortForwarding
│   └── mutations.test.ts
└── ui/
    ├── port-forwarding-panel.tsx      # Main panel with rules + port scanner
    ├── port-forwarding-panel.test.tsx
    ├── add-rule-dialog.tsx            # Dialog for creating new rules
    └── add-rule-dialog.test.tsx
```

## 📦 File Inventory

| File | Type | Exports |
|------|------|---------|
| `api/queries.ts` | API | `useListeningPorts`, `usePortForwardingRules`, `portForwardingKeys`, `ListeningPort`, `PortForwardRule` |
| `api/mutations.ts` | API | `useAddPortForwarding`, `useRemovePortForwarding` |
| `ui/port-forwarding-panel.tsx` | Component | `PortForwardingPanel` |
| `ui/add-rule-dialog.tsx` | Component | `AddRuleDialog` |

## 🔌 API Layer

### Queries

| Hook | Query Key | Tauri Command | Refetch Interval | Description |
|------|-----------|---------------|-------------------|-------------|
| `useListeningPorts(distro)` | `["port-forwarding", "listening", distro]` | `list_listening_ports` | 20s | Scans open ports inside a running distro |
| `usePortForwardingRules(distro?)` | `["port-forwarding", "rules", distro]` | `get_port_forwarding_rules` | 20s | Lists active forwarding rules (optionally filtered by distro) |

### Mutations

| Hook | Tauri Command | Params | Invalidates |
|------|---------------|--------|-------------|
| `useAddPortForwarding` | `add_port_forwarding` | `{ distroName, wslPort, hostPort }` | `["port-forwarding"]` |
| `useRemovePortForwarding` | `remove_port_forwarding` | `ruleId: string` | `["port-forwarding"]` |

## 📐 Interfaces

### `PortForwardRule`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique rule identifier |
| `distro_name` | `string` | Target WSL distribution |
| `wsl_port` | `number` | Port inside WSL |
| `host_port` | `number` | Mapped port on Windows host |
| `protocol` | `string` | Protocol (e.g. TCP) |
| `enabled` | `boolean` | Whether the rule is active |
| `created_at` | `string` | ISO timestamp |

### `ListeningPort`

| Field | Type | Description |
|-------|------|-------------|
| `port` | `number` | Listening port number |
| `protocol` | `string` | Protocol (TCP/UDP) |
| `process` | `string` | Process name |
| `pid` | `number \| null` | Process ID |

## 🧩 Components

### `PortForwardingPanel`

Main panel with three sections:

1. **Distro selector** - dropdown filtered to running distributions
2. **Active rules** - list of forwarding rules with delete button (`ActionIconButton`), plus "Add Rule" button that opens `AddRuleDialog`
3. **Listening ports** - table showing open ports inside the selected distro (port, protocol, process, PID), only visible when a distro is selected

Includes an admin warning note about elevated privileges.

### `AddRuleDialog`

Modal dialog (`DialogShell`) for creating a new port forwarding rule:

- **Distribution selector** - filtered to running distros only
- **Port inputs** - WSL port and host port (1-65535 range)
- **Live preview** - shows the mapping description as ports are entered
- Submit button with loading spinner

---

> 👀 See also: [features/](../) | [wsl-config](../wsl-config/) | [monitoring-dashboard](../monitoring-dashboard/)
