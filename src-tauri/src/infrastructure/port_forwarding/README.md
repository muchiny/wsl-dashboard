# 🔀 Port Forwarding Adapter

> Manages Windows port proxy rules via `netsh.exe` and discovers listening ports inside WSL2 distros via `ss`.

---

## 📁 Files

| File | Description |
|------|-------------|
| `adapter.rs` | **NetshAdapter** — implements `PortForwardingPort`. Methods: `list_listening_ports` (runs `ss -tlnp` inside the distro), `get_wsl_ip` (runs `hostname -I`), `apply_rule` (`netsh interface portproxy add v4tov4`), `remove_rule` (`netsh interface portproxy delete v4tov4`). Includes `parse_ss_output()` helper that parses `ss` tabular output, extracts process names and PIDs, and deduplicates IPv4/IPv6 entries. |
| `mod.rs` | Module re-export. |

## 🔑 Key Technical Details

- `apply_rule` maps `0.0.0.0:{host_port}` to `{wsl_ip}:{wsl_port}` using `netsh interface portproxy`
- `get_wsl_ip` validates the returned IP with `std::net::IpAddr::parse` to prevent injection
- On Windows, commands use `CREATE_NO_WINDOW` flag to suppress console popups
- `parse_ss_output` handles wildcard (`*`), IPv4, and IPv6 local addresses
- Port list is sorted and deduplicated by port number (IPv4+IPv6 collapse to one entry)

## 🧪 Tests

- `parse_ss_output`: typical output, header-only, malformed lines, IPv6, wildcard addresses, deduplication
- `extract_process_name` and `extract_pid`: with and without process info
- Proptest fuzzing: `parse_ss_never_panics`, `extract_process_name_never_panics`, `extract_pid_never_panics`, `parse_ss_ports_are_unique`, `parse_ss_ports_are_sorted`, well-formed line roundtrip

---

> 👀 See also: [`domain/ports/port_forwarding.rs`](../../domain/ports/port_forwarding.rs) for the port trait, and [`sqlite/port_forwarding_repository.rs`](../sqlite/port_forwarding_repository.rs) for rule persistence.
