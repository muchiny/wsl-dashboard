# 🔧 Utilities

> Pure utility functions for class names and locale-aware formatting.

---

## 📂 Files

| File | Key Functions | Description |
|------|---------------|-------------|
| `utils.ts` | `cn(...inputs)` | Merges Tailwind CSS classes using `clsx` + `tailwind-merge`. Example: `cn("px-4", condition && "bg-blue")` |
| `formatters.ts` | `formatBytes(bytes)`, `formatRelativeTime(isoDate)` | Locale-aware formatting utilities. Uses `Intl.NumberFormat` and `Intl.RelativeTimeFormat` with the current i18next language. |

## 🔑 Key Details

- **`cn()`** — The standard pattern for conditional Tailwind classes. Combines `clsx` for conditional logic with `tailwind-merge` to resolve conflicting utility classes (e.g., `px-2` vs `px-4`).
- **`formatBytes()`** — Auto-scales to B, KB, MB, or GB with 2 decimal places. Uses the active i18n locale for number formatting.
- **`formatRelativeTime()`** — Converts an ISO date string to a human-readable relative time (e.g., "2 hours ago", "yesterday"). Falls back to "now" for differences under 1 minute.
- **i18n side effect** — `formatters.ts` imports `@/shared/config/i18n`, which triggers i18next initialization. Keep this in mind for test files.

---

> 👀 See also: [shared/](../README.md) · [ui/](../ui/README.md) · [config/](../config/README.md)
