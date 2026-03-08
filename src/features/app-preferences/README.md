# ⚙️ App Preferences

> Application-wide settings for appearance, monitoring intervals, snapshot paths, and alert thresholds.

---

## 📁 Structure

```
app-preferences/
└── ui/
    └── preferences-panel.tsx   # All-in-one preferences form
```

## 📦 File Inventory

| File | Type | Exports |
|------|------|---------|
| `ui/preferences-panel.tsx` | Component | `PreferencesPanel` |

## 🧩 Component: `PreferencesPanel`

A single component organized into four card sections:

### 1. 🎨 Appearance

- **Theme toggle** - Catppuccin Mocha (dark) / Latte (light), uses `useThemeStore`
- **Language selector** - Dropdown with all supported locales (`en`, `es`, `fr`, `zh`), uses `useLocaleStore`

### 2. ⏱️ Monitoring

- **Metrics interval** - Polling rate for system metrics (1s, 2s, 3s, 5s, 10s, 30s)
- **Process list interval** - Polling rate for the process table (same options)

### 3. 📦 Snapshots

- **Default snapshot directory** - Text input with folder browser (`@tauri-apps/plugin-dialog`)
- **Default install location** - Text input with folder browser

### 4. 🔔 Alert Thresholds

- Per-metric toggle + slider for CPU, memory, and disk alerts
- Threshold range: 50%--99%
- Syncs with backend via `useAlertThresholds` / `useSetAlertThresholds`

## 🗄️ Stores Used

| Store | Source | Purpose |
|-------|--------|---------|
| `usePreferencesStore` | `@/shared/stores/use-preferences-store` | Persisted preferences (Zustand + `persist` middleware, key: `wsl-nexus-preferences`) |
| `useThemeStore` | `@/shared/hooks/use-theme` | Dark/light theme toggle |
| `useLocaleStore` | `@/shared/stores/use-locale-store` | i18n locale selection |

### `usePreferencesStore` State

| Field | Type | Default |
|-------|------|---------|
| `metricsInterval` | `number` | `2000` |
| `processesInterval` | `number` | `3000` |
| `defaultSnapshotDir` | `string` | `""` |
| `defaultInstallLocation` | `string` | `""` |
| `sortKey` | `SortKey` | `"name-asc"` |
| `viewMode` | `ViewMode` | `"grid"` |
| `alertThresholds` | `AlertThreshold[]` | CPU 90%, memory 85%, disk 90% (all disabled) |

## 🔌 External API Hooks

| Hook | Source | Purpose |
|------|--------|---------|
| `useAlertThresholds` | `@/features/monitoring-dashboard/api/queries` | Fetch backend alert thresholds on mount |
| `useSetAlertThresholds` | `@/features/monitoring-dashboard/api/queries` | Persist threshold changes to backend |

---

> 👀 See also: [features/](../) | [wsl-config](../wsl-config/) | [monitoring-dashboard](../monitoring-dashboard/)
