# 📄 Pages

> Route-level components — orchestrate features to build each view.

---

## 🎯 Purpose

Pages are **thin components** that compose multiple features together. They manage page-level state (selected distro, active tab, modal visibility) and are associated with a TanStack Router route.

```mermaid
graph TD
    R["🏠 Root Layout<br/><small>Header + Outlet + DebugConsole</small>"]
    R --> D["🖥️ / — Distributions"]
    R --> M["📊 /monitoring — Monitoring"]
    R --> S["⚙️ /settings — Settings"]

    D --> F1["distro-list + snapshot-list + terminal"]
    M --> F2["monitoring-dashboard + distro-list"]
    S --> F3["wsl-config + port-forwarding + app-preferences + audit-log"]

    style R fill:#313244,stroke:#89b4fa,color:#cdd6f4
    style D fill:#313244,stroke:#a6e3a1,color:#cdd6f4
    style M fill:#313244,stroke:#f9e2af,color:#cdd6f4
    style S fill:#313244,stroke:#cba6f7,color:#cdd6f4
```

---

## 📐 Convention

```
pages/
└── <name>/
    └── ui/
        └── <name>-page.tsx
```

Each page is registered as a route in `router.tsx`.

---

## 📋 Page Inventory

| Route | Page | 🧩 Features Used | Description |
|---|---|---|---|
| `/` | 🖥️ [`DistrosPage`](distros/README.md) | `distro-list`, `distro-events`, `snapshot-list`, `terminal` | Distribution management with snapshots and terminal |
| `/monitoring` | 📊 [`MonitoringPage`](monitoring/README.md) | `monitoring-dashboard`, `distro-list` | Real-time metrics (requires distro selection) |
| `/settings` | ⚙️ [`SettingsPage`](settings/README.md) | `wsl-config`, `audit-log`, `port-forwarding`, `app-preferences` | .wslconfig editor + port forwarding + preferences + audit trail |

---

## 🖼️ Typical Page Structure

```mermaid
graph TD
    subgraph Page["📄 Page Component"]
        H["📌 Header<br/><small>icon + title + description</small>"]
        S["🔽 Selector<br/><small>distro picker or stats cards</small>"]
        C["🧩 Feature Components<br/><small>DistroList, CpuChart, etc.</small>"]
        M["🪟 Modals<br/><small>creation/restoration dialogs</small>"]
        H --> S --> C --> M
    end
```

1. 📌 **Header**: Lucide icon + title + description + optional action button
2. 🔽 **Selector**: Many pages require choosing a distro (`useDistros()`)
3. 🧩 **Content**: One or more feature components
4. 🪟 **Modals**: Creation/restoration dialogs (hoisted to page level)

---

## 📖 Page Details

### 🖥️ `/` — Distributions

Full grid of `DistroCard` components with Start/Stop/Restart buttons, Shutdown All, terminal launch, and integrated snapshot management. This is the home page. 🏠

### 📊 `/monitoring` — Monitoring

Distro selector, then 4 charts (CPU, memory, network, disk) + process table. 📈

### ⚙️ `/settings` — Settings

Multiple sections: `.wslconfig` editor (form) + VHDX compact panel + port forwarding panel + app preferences (language, theme, alerts) + searchable audit trail. 🛠️

---

> 👀 See also: [🧩 Features](../features/README.md) · [📦 Shared](../shared/README.md) · [🔲 Widgets](../widgets/README.md)
