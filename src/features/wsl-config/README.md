# ⚙️ WSL Config

> Visual editor for `.wslconfig` global settings with validation, version info display, and VHDX optimization.

---

## 📁 Structure

```
wsl-config/
├── api/
│   ├── mutations.ts          # useUpdateWslConfig, useCompactVhdx
│   ├── queries.ts            # useWslConfig, useWslVersion
│   └── queries.test.ts
├── lib/
│   ├── validation.ts         # validateWslConfig, hasErrors
│   └── validation.test.ts
└── ui/
    ├── wslconfig-editor.tsx   # Main config form
    ├── wslconfig-editor.test.tsx
    ├── wsl-info-panel.tsx     # WSL version info card
    └── vhdx-compact-panel.tsx # VHDX sparse-mode optimization
```

## 🔌 API Layer

### Queries

| Hook | Query Key | Tauri Command | Description |
|------|-----------|---------------|-------------|
| `useWslConfig` | `["wsl-config", "global"]` | `get_wsl_config` | Fetches the current `.wslconfig` as `WslGlobalConfig` |
| `useWslVersion` | `["wsl-config", "version"]` | `get_wsl_version` | Fetches WSL/kernel/WSLg/Windows versions (staleTime: 60s) |

### Mutations

| Hook | Tauri Command | Invalidates | Description |
|------|---------------|-------------|-------------|
| `useUpdateWslConfig` | `update_wsl_config` | `["wsl-config"]` | Saves the full `WslGlobalConfig` object |
| `useCompactVhdx` | `compact_vhdx` | `["distros"]` | Enables sparse mode on a distro's VHDX |

## 📐 Interfaces

### `WslGlobalConfig`

18 fields covering `[wsl2]` and `[experimental]` sections:

| Field | Type | Section |
|-------|------|---------|
| `memory` | `string \| null` | `[wsl2]` |
| `processors` | `number \| null` | `[wsl2]` |
| `swap` | `string \| null` | `[wsl2]` |
| `swap_file` | `string \| null` | `[wsl2]` |
| `localhost_forwarding` | `boolean \| null` | `[wsl2]` |
| `kernel` | `string \| null` | `[wsl2]` |
| `kernel_command_line` | `string \| null` | `[wsl2]` |
| `nested_virtualization` | `boolean \| null` | `[wsl2]` |
| `vm_idle_timeout` | `number \| null` | `[wsl2]` |
| `dns_tunneling` | `boolean \| null` | `[wsl2]` |
| `firewall` | `boolean \| null` | `[wsl2]` |
| `auto_proxy` | `boolean \| null` | `[wsl2]` |
| `networking_mode` | `string \| null` | `[wsl2]` |
| `gui_applications` | `boolean \| null` | `[wsl2]` |
| `default_vhd_size` | `string \| null` | `[wsl2]` |
| `dns_proxy` | `boolean \| null` | `[wsl2]` |
| `safe_mode` | `boolean \| null` | `[wsl2]` |
| `auto_memory_reclaim` | `string \| null` | `[experimental]` |
| `sparse_vhd` | `boolean \| null` | `[experimental]` |

### `WslVersionInfo`

| Field | Type |
|-------|------|
| `wsl_version` | `string \| null` |
| `kernel_version` | `string \| null` |
| `wslg_version` | `string \| null` |
| `windows_version` | `string \| null` |

## ✅ Validation Rules

Defined in `lib/validation.ts` using `validateWslConfig()`:

| Field | Rule | Error Message |
|-------|------|---------------|
| `memory` | Must match `/^\d+(KB\|MB\|GB)$/i` | "Must be a number followed by KB, MB, or GB (e.g. 4GB)" |
| `swap` | Must match `/^\d+(KB\|MB\|GB)$/i` | "Must be a number followed by KB, MB, or GB (e.g. 2GB)" |
| `processors` | Integer between 1 and 128 | "Must be an integer between 1 and 128" |
| `vm_idle_timeout` | Non-negative integer | "Must be a non-negative integer" |
| `default_vhd_size` | Must match `/^\d+(KB\|MB\|GB)$/i` | "Must be a number followed by KB, MB, or GB (e.g. 1024GB)" |

The `hasErrors()` helper returns `true` if any validation error exists.

## 🧩 Components

### `WslConfigEditor`

The main `.wslconfig` form with:
- **Primary fields** (always visible): memory, processors, swap, VM idle timeout
- **Select dropdowns**: networking mode (NAT/Mirrored/VirtioProxy/None), auto memory reclaim (disabled/gradual/dropcache)
- **Boolean toggles**: 9 checkbox flags (localhost forwarding, nested virtualization, DNS tunneling, firewall, auto proxy, GUI applications, DNS proxy, safe mode, sparse VHD)
- **Advanced section** (collapsible): custom kernel path, kernel command line, swap file path, default VHD size
- **Save button** with loading spinner, disabled when validation fails
- Tracks touched fields for per-field error display on blur

### `WslInfoPanel`

Read-only card displaying WSL version information in a 4-column grid:
- WSL version, kernel version, WSLg version, Windows version
- Loading skeleton and error states

### `VhdxCompactPanel`

VHDX sparse-mode optimization panel:
- Distro selector (filters to WSL2 distributions only)
- "Enable Sparse" button invoking `useCompactVhdx`
- Info note about the optimization

---

> 👀 See also: [features/](../) | [snapshot-list](../snapshot-list/) | [app-preferences](../app-preferences/)
