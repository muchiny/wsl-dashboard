# 🌍 Locales

> Internationalization translation files for WSL Nexus.

---

## 🗂️ Supported Languages

| Language            | Code | File                       | Flag |
| ------------------- | ---- | -------------------------- | ---- |
| English             | `en` | `en/translation.json`      | 🇬🇧   |
| Spanish             | `es` | `es/translation.json`      | 🇪🇸   |
| French              | `fr` | `fr/translation.json`      | 🇫🇷   |
| Chinese (Simplified)| `zh` | `zh/translation.json`      | 🇨🇳   |

## 🏗️ Translation Key Structure

Each `translation.json` file is organized into top-level namespaces that map to application features:

| Namespace           | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `common`            | Shared labels (Confirm, Cancel, Save, etc.)|
| `header`            | App header, window controls, theme toggle  |
| `nav`               | Navigation tab labels                      |
| `distros`           | Distribution list, actions, filters, toasts|
| `snapshots`         | Snapshot management (create, restore, delete)|
| `monitoring`        | Real-time metrics, charts, process table   |
| `settings`          | Settings page tabs                         |
| `preferences`       | Appearance, intervals, alerts, directories |
| `wslConfig`         | `.wslconfig` editor fields                 |
| `wslInfo`           | WSL system information panel               |
| `vhdxOptimization`  | VHDX sparse mode optimization              |
| `portForwarding`    | Port forwarding rules and listening ports  |
| `auditLog`          | Audit log viewer                           |
| `debug`             | Debug console                              |
| `terminal`          | Terminal tabs and controls                 |
| `errors`            | Error boundary messages                    |
| `toast`             | Toast notification labels                  |

Keys support i18next interpolation (`{{variable}}`), plurals (`_one` / `_other` suffixes), and HTML via `<code>` / `<strong>` tags with `Trans` component.

## ➕ How to Add a New Language

1. Create a new directory under `src/locales/` with the [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) language code (e.g., `de/`).
2. Copy `en/translation.json` into the new directory and translate all values.
3. Register the language in `src/shared/config/i18n.ts` by adding it to the resources object.
4. Add a menu entry in the language switcher widget (`src/widgets/header/ui/language-switcher.tsx`).

```
src/locales/
├── en/translation.json
├── es/translation.json
├── fr/translation.json
└── zh/translation.json
```

---

> 👀 See also: [`src/shared/config/i18n.ts`](../shared/config/i18n.ts) — i18next initialization and configuration.
