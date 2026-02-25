# 📄 Pages

> Route-level components — orchestrate features to build each view.

---

## 🎯 Purpose

Pages are **thin components** that compose multiple features together. They manage page-level state (selected distro, active tab, modal visibility) and are associated with a TanStack Router route.

---

## 📁 Convention

```
pages/
└── <name>/
    └── ui/
        └── <name>-page.tsx
```

Each page is registered as a route in `router.tsx`.

---

## 📊 Page Inventory

| Route | Page | Features Used | Description |
|---|---|---|---|
| `/` | `DashboardPage` | `distro-list` | Overview with distribution statistics |
| `/distros` | `DistrosPage` | `distro-list`, `distro-events` | Full distribution management (list, actions) |
| `/snapshots` | `SnapshotsPage` | `snapshot-list`, `distro-list` | Snapshot creation and restoration |
| `/monitoring` | `MonitoringPage` | `monitoring-dashboard`, `distro-list` | Real-time metrics (requires distro selection) |
| `/docker` | `DockerPage` | `docker-containers`, `distro-list` | Docker containers and images |
| `/iac` | `IacPage` | `iac-integrations`, `distro-list` | Detected IaC tools + Kubernetes info |
| `/settings` | `SettingsPage` | `wsl-config`, `audit-log` | .wslconfig editor + audit trail |

---

## 🏗️ Typical Page Structure

Most pages follow this pattern:

```
┌──────────────────────────────────────────┐
│ 🔵 Header (icon + title + description)   │
│ 📊 [Distro selector or stats cards]      │
├──────────────────────────────────────────┤
│                                          │
│  🧩 Feature component(s)                │
│  (e.g. DistroList, CpuChart, etc.)      │
│                                          │
├──────────────────────────────────────────┤
│ 🪟 Modals (if needed)                   │
└──────────────────────────────────────────┘
```

1. **Header**: Lucide icon + title + description + optional action button
2. **Selector**: Many pages require choosing a distro (`useDistros()`)
3. **Content**: One or more feature components
4. **Modals**: Creation/restoration dialogs (hoisted to page level)

---

## 📝 Page Details

### `/` — Dashboard

Quick overview: distro count, global status, shortcuts to other pages.

### `/distros` — Distributions

Full grid of `DistroCard` components with Start/Stop/Restart buttons and Shutdown All.

### `/snapshots` — Snapshots

Distro selector at the top, snapshot list below. "Create" button opens the `create-snapshot-dialog`.

### `/monitoring` — Monitoring

Distro selector, then 4 charts (CPU, memory, network, disk) + process table.

### `/docker` — Docker

Distro selector, then tabbed interface: Containers tab + Images tab.

### `/iac` — IaC

Distro selector, then detected tools grid + Kubernetes panel (if kubectl available).

### `/settings` — Settings

Two sections: `.wslconfig` editor (form) + VHDX compact panel + searchable audit trail.

---

> 📖 See also: [🧩 Features](../features/README.md) · [🔧 Shared](../shared/README.md) · [🧱 Widgets](../widgets/README.md)
