# 📜 Scripts

> Build and utility scripts for WSL Nexus development.

---

## 🗂️ File Inventory

| Script                    | Language   | Purpose                                                                             |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `generate-dev-cert.ps1`  | PowerShell | Generates a self-signed code signing certificate for dev builds (run once per machine) |
| `sign.ps1`               | PowerShell | Signs a binary with the WSL Nexus dev certificate (called by Tauri during build)     |

## 🔐 `generate-dev-cert.ps1`

Creates a self-signed code signing certificate in the current user's certificate store and adds it to the Trusted Root store. This suppresses the "unknown publisher" warning when running dev builds.

- **Requires**: Administrator privileges (`#Requires -RunAsAdministrator`)
- **Certificate**: `CN=WSL Nexus Dev, O=muchini`
- **Validity**: 3 years
- **Algorithm**: RSA 2048-bit, SHA256
- **Idempotent**: Skips creation if a valid certificate already exists

```powershell
powershell -ExecutionPolicy Bypass -File scripts\generate-dev-cert.ps1
```

## ✍️ `sign.ps1`

Called automatically by Tauri's `signCommand` during `cargo tauri build`. Looks up the dev certificate and applies an Authenticode signature with a DigiCert timestamp.

- **Input**: File path passed as the first positional parameter by Tauri
- **Prerequisite**: Run `generate-dev-cert.ps1` first
- **Timestamp server**: `http://timestamp.digicert.com`

```powershell
powershell -File scripts\sign.ps1 "path\to\binary.exe"
```

---

> 👀 See also: [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) — Tauri build configuration where `signCommand` is defined.
