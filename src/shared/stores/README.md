# 🏪 Stores

> Zustand stores for locale and user preferences, persisted to `localStorage`.

---

## 📋 Store Reference

| Store | State Fields | Actions | Persistence |
|-------|-------------|---------|-------------|
| `useLocaleStore` | `locale: Locale` (`"en"` \| `"fr"` \| `"es"` \| `"zh"`) | `setLocale(locale)` — changes i18next language and sets `lang` attribute on `<html>` | `localStorage` key `wsl-nexus-locale` |
| `usePreferencesStore` | `metricsInterval` (default 2000ms), `processesInterval` (default 3000ms), `defaultSnapshotDir`, `defaultInstallLocation`, `sortKey`, `viewMode` (`"grid"` \| `"list"`), `alertThresholds` | `setMetricsInterval`, `setProcessesInterval`, `setDefaultSnapshotDir`, `setDefaultInstallLocation`, `setSortKey`, `setViewMode`, `setAlertThresholds` | `localStorage` key `wsl-nexus-preferences` |

## 📂 Files

| File | Exports |
|------|---------|
| `use-locale-store.ts` | `useLocaleStore`, `useLocaleSync` (DOM sync hook — call once at app root) |
| `use-preferences-store.ts` | `usePreferencesStore`, `SortKey`, `ViewMode` |

## 🔑 Key Details

- **Sort keys** — `SortKey` supports: `name-asc`, `name-desc`, `status-running`, `status-stopped`, `vhdx-size`, `default-first`.
- **Alert thresholds** — Default thresholds for CPU (90%), memory (85%), and disk (90%), all disabled by default. Uses the `AlertThreshold` type from `@/shared/types/monitoring`.
- **Rehydration** — Both stores use Zustand's `persist` middleware with `onRehydrateStorage` to apply side effects (DOM attribute updates, i18next language change) when the store loads from `localStorage`.

---

> 👀 See also: [shared/](../README.md) · [hooks/](../hooks/README.md) · [types/](../types/README.md) · [config/](../config/README.md)
