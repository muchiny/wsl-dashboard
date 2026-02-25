# 🧱 Widgets

> Shared layout components — Navigation Sidebar and Header.

---

## 🎯 Purpose

Widgets are **layout components** used by the root layout (`router.tsx`). They wrap all pages and provide the main navigation and global controls.

---

## 📁 Structure

```
widgets/
├── sidebar/
│   └── ui/
│       └── sidebar.tsx     # Main navigation (7 items)
└── header/
    └── ui/
        └── header.tsx      # Top bar + theme toggle
```

---

## 📍 Sidebar — Main Navigation

The sidebar occupies the left column (`w-64`, `border-r`) and contains:

### Navigation Items

| Icon | Label | Route | Description |
|---|---|---|---|
| 🏠 `LayoutDashboard` | Dashboard | `/` | Overview |
| 📦 `Server` | Distributions | `/distros` | Distro management |
| 💾 `Archive` | Snapshots | `/snapshots` | Backups |
| 📈 `Activity` | Monitoring | `/monitoring` | Real-time metrics |
| 🐳 `Container` | Docker | `/docker` | Containers and images |
| 🔧 `Wrench` | IaC | `/iac` | Infrastructure as Code |
| ⚙️ `Settings` | Settings | `/settings` | WSL config + audit |

### Behavior

- Uses TanStack Router `Link` for navigation
- Detects the active route via `useMatchRoute()` with fuzzy matching
- Active style: `bg-primary/10 text-primary` on the current item
- Hover style: `hover:bg-muted` on inactive items

---

## 🔝 Header — Top Bar

The header occupies the top bar (`h-14`, `border-b`) and contains:

### Theme Toggle

- Button with `Sun` ☀️ icon (light theme) or `Moon` 🌙 icon (dark theme)
- Uses the `useThemeStore()` Zustand hook
- Persists the choice in `localStorage` under the `wsl-nexus-theme` key

---

## 🔄 Layout Integration

Widgets are used in the root component of `router.tsx`:

```
┌─────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────┐ │
│ │          │ │ 🔝 Header (h-14)               │ │
│ │          │ ├────────────────────────────────┤ │
│ │ 📍       │ │                                │ │
│ │ Sidebar  │ │  📄 Page (Outlet)              │ │
│ │ (w-64)   │ │                                │ │
│ │          │ │                                │ │
│ │          │ │                                │ │
│ └──────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

> 📖 See also: [🧩 Features](../features/README.md) · [🔧 Shared](../shared/README.md) · [📄 Pages](../pages/README.md)
