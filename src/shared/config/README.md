# 🔧 Configuration

> App-wide configuration for internationalization and server state management.

---

## 📂 Files

| File | Purpose |
|------|---------|
| `i18n.ts` | Initializes i18next with `react-i18next`. Bundles all translation JSON files at build time. |
| `i18n.d.ts` | TypeScript module augmentation for i18next, enabling type-safe `t()` calls against the English translation JSON. |
| `query-client.ts` | Creates and exports a singleton `QueryClient` for TanStack Query. |

## 🌐 i18n Configuration

| Setting | Value |
|---------|-------|
| Supported locales | `en`, `fr`, `es`, `zh` |
| Default language | `en` |
| Fallback language | `en` |
| Namespace | `translation` (single namespace) |
| Interpolation escaping | Disabled (`escapeValue: false`) — React handles XSS |

**Exported types:**
- `Locale` — `"en" | "fr" | "es" | "zh"`
- `supportedLocales` — readonly tuple of all locale codes
- `localeLabels` — human-readable label for each locale (e.g., `"Francais"`, `"Espanol"`, `"Chinese"`)

**Gotcha:** Importing this module triggers i18next initialization as a side effect. Test files that import `formatters.ts` will indirectly trigger this.

## 🔍 Query Client Configuration

| Setting | Value |
|---------|-------|
| `staleTime` | 5 seconds |
| `gcTime` | 5 minutes |
| `retry` | 1 attempt |
| `refetchOnWindowFocus` | Disabled |

---

> 👀 See also: [shared/](../README.md) · [api/](../api/README.md) · [stores/](../stores/README.md) · [lib/](../lib/README.md)
