<div align="center">

# 🚀 WSL Nexus

**Your all-in-one desktop dashboard for WSL2 management**

![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Rust 1.93](https://img.shields.io/badge/Rust-1.93-orange?logo=rust)
![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![License MIT](https://img.shields.io/badge/License-MIT-green)

</div>

---

## ✨ Features

🖥️ **Distributions** — Start, stop, restart WSL distros at a glance
📸 **Snapshots** — Backup & restore (tar / vhdx)
📊 **Monitoring** — Live CPU, RAM, disk, network charts + processes + alerts
💻 **Terminal** — Interactive WSL shell via xterm
🔀 **Port Forwarding** — WSL → Windows port mapping
⚙️ **Configuration** — `.wslconfig` editor + VHDX compaction
📋 **Audit Log** — Full action traceability
🐛 **Debug Console** — Real-time log viewer (`Ctrl+Shift+D`)
🌍 **i18n** — EN · ES · FR · ZH
🎨 **Theming** — Catppuccin Mocha 🌙 / Latte ☀️

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph FE["🖼️ Frontend — React 19 + TypeScript 5.9"]
        direction LR
        P["📄 Pages<br/><small>3 routes</small>"]
        F["🧩 Features<br/><small>8 slices</small>"]
        W["🔲 Widgets"]
        S["📦 Shared"]
        P --> F
        P --> W
        F --> S
        W --> S
    end

    subgraph BE["⚙️ Backend — Rust 1.93 + Tauri v2"]
        direction LR
        PR["🎯 Presentation<br/><small>29 commands</small>"]
        AP["📋 Application<br/><small>CQRS</small>"]
        DO["💎 Domain<br/><small>8 ports</small>"]
        IN["🔌 Infrastructure<br/><small>9 adapters</small>"]
        PR --> AP --> DO
        IN -.->|implements| DO
    end

    FE <-->|"⚡ Tauri IPC"| BE

    IN --> WSL["🪟 wsl.exe"]
    IN --> DB["🗄️ SQLite"]
    IN --> PROC["📊 /proc"]
    IN --> NET["🌐 netsh"]
```

---

## 🚦 Getting Started

```mermaid
flowchart LR
    A["🔧 <b>Prerequisites</b><br/>Windows 10/11 + WSL2<br/>Rust 1.93 · Node ≥ 18"]
    B["📥 <b>Clone & Install</b><br/>git clone + npm install"]
    C["🚀 <b>Dev Mode</b><br/>npm run tauri dev"]
    D["🧪 <b>Test</b><br/>npm test + cargo test"]
    E["📦 <b>Build</b><br/>npm run tauri build"]

    A --> B --> C --> D --> E

    style A fill:#313244,stroke:#89b4fa,color:#cdd6f4
    style B fill:#313244,stroke:#a6e3a1,color:#cdd6f4
    style C fill:#313244,stroke:#f9e2af,color:#cdd6f4
    style D fill:#313244,stroke:#cba6f7,color:#cdd6f4
    style E fill:#313244,stroke:#f38ba8,color:#cdd6f4
```

```bash
git clone https://github.com/muchini/wsl-nexus.git && cd wsl-nexus
npm install           # 📦 Frontend deps (Cargo handles Rust)
npm run tauri dev     # 🚀 Launch with hot-reload
```

---

## 🧪 Tests

| | Layer | Command | Count |
|---|---|---|---|
| 🖼️ | Frontend | `npm run test` | **383** (40 files) |
| 🦀 | Backend | `cd src-tauri && cargo test` | **~140** |

> 🔄 **CI/CD** — GitHub Actions runs lint + format + clippy + tests on every push. Tags `v*` build a Windows installer (.msi / .exe).

---

## 📂 Structure

```
wsl-nexus/
├── 🦀 src-tauri/               # Rust backend (Hexagonal + CQRS)
│   ├── 💎 domain/              # Entities, value objects, ports
│   ├── 📋 application/         # CQRS handlers, DTOs
│   ├── 🔌 infrastructure/      # WSL CLI, SQLite, ProcFS, PTY, netsh
│   └── 🎯 presentation/        # Tauri commands, AppState
│
└── 🖼️ src/                     # React frontend (Feature-Sliced Design)
    ├── 🧩 features/            # 8 feature slices + 1 hook
    ├── 📄 pages/               # Distributions · Monitoring · Settings
    ├── 🔲 widgets/             # Header + Debug Console
    └── 📦 shared/              # API, hooks, stores, UI
```

---

## 📚 Docs

> Every directory has its own detailed README — dive in!

| | Layer | Link |
|---|---|---|
| 🦀 | **Backend overview** | [src-tauri/](src-tauri/README.md) |
| 💎 | Domain | [domain/](src-tauri/src/domain/README.md) |
| 📋 | Application | [application/](src-tauri/src/application/README.md) |
| 🔌 | Infrastructure | [infrastructure/](src-tauri/src/infrastructure/README.md) |
| 🎯 | Presentation | [presentation/](src-tauri/src/presentation/README.md) |
| 🖼️ | **Frontend overview** | [src/](src/README.md) |
| 🧩 | Features | [features/](src/features/README.md) |
| 📦 | Shared | [shared/](src/shared/README.md) |
| 📄 | Pages | [pages/](src/pages/README.md) |
| 🔲 | Widgets | [widgets/](src/widgets/README.md) |

---

## 📜 License

MIT
