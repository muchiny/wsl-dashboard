# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WSL Nexus is a Tauri v2 desktop app for managing WSL2 distributions. Rust backend + React frontend.

## Common Commands

### Development
```bash
npm install                    # Install frontend deps (Cargo handles Rust automatically)
npm run tauri dev              # Launch app with hot-reload (frontend + backend)
npm run dev                    # Frontend-only dev server (no Tauri)
```

### Testing
```bash
npm run test                   # Run all frontend tests (vitest, ~562 tests)
npm run test:watch             # Vitest watch mode
npx vitest run src/features/distro-list  # Run tests for a specific feature/directory
npx vitest run src/shared/ui/Select      # Run a single test file by path
cd src-tauri && cargo test     # Run all backend tests (~243 tests)
cd src-tauri && cargo test snapshot  # Run backend tests matching a name
```

### Linting & Formatting
```bash
npm run lint                   # ESLint
npm run lint:fix               # ESLint with auto-fix
npm run format                 # Prettier format
npm run format:check           # Prettier check
cd src-tauri && cargo fmt      # Rust formatting
cd src-tauri && cargo clippy   # Rust lints
```

### Building
```bash
npm run tauri build            # Production build (generates NSIS + MSI installers)
```

### E2E Tests
```bash
npm run e2e                    # Playwright tests (Chromium)
npm run e2e:ui                 # Playwright UI mode
npm run e2e:headed             # Playwright headed mode
npm run e2e:wdio               # WebdriverIO full-stack tests (Windows only, uses tauri-driver)
```

### Fuzz Testing
```bash
cd src-tauri && cargo fuzz list           # List all 13 fuzz targets
cd src-tauri && cargo fuzz run <target>   # Run a specific fuzz target
```

## Architecture

### Backend (src-tauri/src/) - Hexagonal Architecture + CQRS

- **domain/**: Entities (distro, snapshot, monitoring, wsl_config, wsl_version, port_forward), value objects (DistroName, DistroState, MemorySize, SnapshotId, WslVersion), 7 port traits, DomainError (13 variants)
- **application/**:
  - Commands: CreateSnapshot, DeleteSnapshot, RestoreSnapshot
  - Queries: ListDistros, ListSnapshots, GetDistroDetails
  - Services: DistroService, MetricsCollector (2s loop), MetricsAggregator (60s loop)
  - DTOs: DistroResponse, SnapshotResponse, DistroDetailResponse
- **infrastructure/**: Adapters implementing domain ports:
  - `wsl_cli/adapter.rs` - WslCliAdapter (calls wsl.exe, parses UTF-16LE output, .wslconfig INI parser)
  - `sqlite/` - SqliteDb (WAL mode, 3 migrations) + 5 repository adapters (snapshots, audit, metrics, alerts, port forwarding)
  - `monitoring/adapter.rs` - ProcFsMonitoringAdapter (reads /proc via wsl.exe)
  - `terminal/adapter.rs` - TerminalSessionManager (portable-pty, UUID sessions)
  - `port_forwarding/adapter.rs` - NetshAdapter (netsh.exe + ss + hostname)
  - `debug_log/` - DebugLogBuffer (ring buffer, max 1000) + DebugLogLayer (tracing layer, emits `debug-log-event`)
- **presentation/**: 33 Tauri IPC commands across 8 modules (distro, snapshot, monitoring, settings, audit, terminal, port_forwarding, debug) + AppState composition root (9 fields)

Dependency flow: Presentation -> Application -> Domain <- Infrastructure

### Frontend (src/) - Feature-Sliced Design

- **pages/**: 3 routes — `/` (Distributions), `/monitoring?distro=` (Monitoring), `/settings` (Settings)
- **features/**: 8 feature slices (distro-list, snapshot-list, monitoring-dashboard, wsl-config, audit-log, terminal, port-forwarding, app-preferences) + distro-events hook
- **widgets/**: Header (nav tabs, theme toggle, language switcher, window controls), DebugConsole (log viewer with level filters)
- **shared/**:
  - UI: ActionIconButton, ConfirmDialog, DialogShell, Select, Toast/ToastContainer, ToggleSwitch, ErrorBoundary, RootLayout
  - Stores (Zustand 5): usePreferencesStore (persisted), useLocaleStore (persisted), useThemeStore (persisted), useTerminalStore (in-memory)
  - API: `tauri-client.ts` (invoke wrapper with IPC timing), `use-tauri-mutation.ts` (auto-invalidation + toast), query key factories
  - Hooks: use-theme, use-tauri-event, use-debug-console, use-debounce
  - i18n: 4 languages (en, fr, es, zh), single "translation" namespace

Path alias: `@/` maps to `./src/`

### Key Wiring

`src-tauri/src/lib.rs` is the composition root — creates all adapters, wires them into AppState (9 fields + TerminalSessionManager), spawns background tasks (MetricsCollector at 2s, MetricsAggregator at 60s), sets up system tray (dynamic distro menu, refreshes every 10s), configures tracing (console + DebugLogLayer), and installs panic hook (writes to crash.log + Windows MessageBox).

### Tauri Events

Backend emits these events to frontend: `system-metrics`, `alert-triggered`, `terminal-output`, `terminal-exit`, `debug-log-event`.

## CI/CD

- `.github/workflows/ci.yml` — Runs on push/PR to main: frontend job (lint + format + typecheck + tests), Rust job (fmt + clippy + cargo test), Playwright E2E, WebdriverIO E2E (Windows)
- `.github/workflows/release.yml` — Triggered on `v*` tags: gates on CI, builds NSIS + MSI installers via tauri-apps/tauri-action, creates GitHub release draft

## Important Technical Gotchas

- **UTF-16LE**: `wsl.exe` outputs UTF-16LE. Handled by `infrastructure/wsl_cli/encoding.rs` with BOM detection + UTF-8 fallback.
- **noUncheckedIndexedAccess**: Enabled in tsconfig. Array accesses return `T | undefined` — use `!` assertion or optional chaining.
- **mockall limitation**: Can't handle `Option<&str>` in async traits. Use `Option<String>` in port trait signatures.
- **Tauri Manager trait**: Must import `tauri::Manager` for `app_handle.path()` and `.manage()`.
- **SQLite init**: Uses `block_on` inside Tauri `setup` hook (async in sync context). WAL mode + busy_timeout 5s.
- **Tauri icons**: Must be RGBA PNG (color type 6), not RGB.
- **Custom title bar**: `decorations: false` in tauri.conf.json — app draws its own header with drag region, window controls, and double-click maximize.
- **Close → minimize**: Window close event is intercepted; the window hides instead of closing (tray-based app lifecycle).
- **CSP**: Allows `unsafe-inline` styles + `unsafe-eval` scripts + ipc/localhost connections.
- **Frontend tests**: All component tests use `renderWithProviders` from `@/test/test-utils` (wraps QueryClientProvider + I18nextProvider). DistroCard/DistroRow tests need mocks for `@/features/terminal/api/mutations` and `@tanstack/react-router`.
- **i18n side effect**: `formatters.ts` imports `@/shared/config/i18n` which triggers i18n initialization.
- **Catppuccin theming**: Mocha (dark) / Latte (light), toggled via `data-theme` attribute. Color vars + glassmorphism utilities + neon glows defined in `app.css`. Includes `prefers-reduced-motion` and `prefers-contrast: high` support.
- **`cfg(fuzzing)`**: lib.rs gates most imports/run() behind `#[cfg(not(fuzzing))]`. 13 fuzz targets in `src-tauri/fuzz/` targeting parsers (INI, ports, meminfo, distro list, CPU, docker, k8s, etc.).
- **Alert cooldown**: 5-minute cooldown per (distro, alert_type) to prevent spam. Default thresholds: CPU 90%, Memory 85%, Disk 90%.
- **Metrics pipeline**: Raw samples (2s) retained ~1h, aggregated 1-min buckets retained ~24h. Query handler auto-selects granularity based on time range.
- **CREATE_NO_WINDOW**: `0x0800_0000` flag on Windows prevents console popups when spawning wsl.exe/netsh.exe.

## Key Versions

- **Rust edition 2024** (Cargo.toml) — affects closures, unsafe blocks, and other language semantics
- **App**: 1.0.9 | **Tauri**: 2.10.1 | **React**: 19 | **TypeScript**: 5.9 | **Vite**: 7
- **Tailwind**: 4 (via @tailwindcss/vite plugin, no tailwind.config.js) | **Zod**: 4
- **TanStack Query**: 5 | **TanStack Router**: 1 | **Zustand**: 5 | **Recharts**: 3 | **xterm**: 6
- **Node**: ≥18 (CI uses 22) | **sqlx**: 0.8 | **mockall**: 0.14 | **proptest**: 1

## Testing Configuration

- **Vitest**: jsdom environment, globals: true, css: true, setupFiles: `src/test/setup.ts`. Excludes `e2e/**` and `e2e-wdio/**`.
- **Playwright**: Chromium only, 2 retries in CI, serial workers in CI. WebServer: `npm run dev` on port 1420.
- **WebdriverIO**: tauri-driver on port 4444, mocha framework, 60s timeout. Windows-only (full app binary).
- **Rust**: mockall for port mocking, proptest for property-based tests, tokio-test for async tests.
