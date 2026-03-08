# 📄 Settings Page

> Tabbed settings page composing WSL configuration, port forwarding, disk optimization, audit log, and app preferences.

---

## 🧩 Tab Layout

The page uses an internal tab bar (not router-based) to switch between five settings sections. Each tab renders a feature slice component.

```mermaid
graph TD
    SP[SettingsPage]
    SP --> TB[Tab Bar]

    TB --> T1["📝 Config"]
    TB --> T2["🌐 Network"]
    TB --> T3["💾 Optimization"]
    TB --> T4["📜 Audit"]
    TB --> T5["⚙️ Preferences"]

    T1 --> WIP[WslInfoPanel]
    T1 --> WCE[WslConfigEditor]
    T2 --> PFP[PortForwardingPanel]
    T3 --> VCP[VhdxCompactPanel]
    T4 --> ALV[AuditLogViewer]
    T5 --> PP[PreferencesPanel]
```

## ⚙️ Tab Details

| Tab | ID | Icon | Feature Slice | Components |
|---|---|---|---|---|
| **Config** | `config` | `FileText` | `wsl-config` | `WslInfoPanel` + `WslConfigEditor` |
| **Network** | `network` | `Network` | `port-forwarding` | `PortForwardingPanel` |
| **Optimization** | `optimization` | `HardDrive` | `wsl-config` | `VhdxCompactPanel` |
| **Audit** | `audit` | `ScrollText` | `audit-log` | `AuditLogViewer` |
| **Preferences** | `preferences` | `SlidersHorizontal` | `app-preferences` | `PreferencesPanel` |

## 🎨 Accessibility

- Tab bar uses proper `role="tablist"` / `role="tab"` / `role="tabpanel"` ARIA pattern
- Each tab panel is linked via `aria-controls` and `aria-labelledby`
- Active tab has `aria-selected="true"`

## 📂 Files

| File | Description |
|---|---|
| `ui/settings-page.tsx` | Page component — tab state, ARIA tab pattern, conditional panel rendering |

## 🔗 Dependencies

| Dependency | Source |
|---|---|
| `WslConfigEditor`, `WslInfoPanel`, `VhdxCompactPanel` | `@/features/wsl-config` |
| `PortForwardingPanel` | `@/features/port-forwarding` |
| `AuditLogViewer` | `@/features/audit-log` |
| `PreferencesPanel` | `@/features/app-preferences` |

---

> 👀 See also: [Pages](../README.md) · [Distributions Page](../distros/README.md) · [Monitoring Page](../monitoring/README.md)
