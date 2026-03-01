import { test as base, type Page } from "@playwright/test";

// ── Mock data ──────────────────────────────────────────────────────

const MOCK_DISTROS = [
  {
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: true,
    base_path: "C:\\Users\\user\\wsl\\Ubuntu",
    vhdx_size_bytes: 10_737_418_240,
    last_seen: "2026-02-28T10:00:00Z",
  },
  {
    name: "Debian",
    state: "Stopped",
    wsl_version: 2,
    is_default: false,
    base_path: "C:\\Users\\user\\wsl\\Debian",
    vhdx_size_bytes: 5_368_709_120,
    last_seen: "2026-02-28T09:00:00Z",
  },
  {
    name: "Fedora",
    state: "Running",
    wsl_version: 2,
    is_default: false,
    base_path: "C:\\Users\\user\\wsl\\Fedora",
    vhdx_size_bytes: 8_589_934_592,
    last_seen: "2026-02-28T08:00:00Z",
  },
  {
    name: "Alpine",
    state: "Stopped",
    wsl_version: 1,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2026-02-27T12:00:00Z",
  },
];

const MOCK_SNAPSHOTS = [
  {
    id: "snap-001",
    distro_name: "Ubuntu",
    name: "Before upgrade",
    description: "Snapshot before system upgrade",
    snapshot_type: "full",
    format: "tar",
    file_path: "C:\\snapshots\\ubuntu-snap.tar",
    file_size_bytes: 2_147_483_648,
    parent_id: null,
    created_at: "2026-02-25T15:00:00Z",
    status: "completed",
  },
];

const MOCK_WSL_CONFIG = {
  memory: "8GB",
  processors: 4,
  swap: "2GB",
  swap_file: null,
  localhost_forwarding: true,
  kernel: null,
  kernel_command_line: null,
  nested_virtualization: false,
  vm_idle_timeout: null,
  dns_tunneling: true,
  firewall: true,
  auto_proxy: true,
  networking_mode: "mirrored",
  gui_applications: true,
  default_vhd_size: null,
  dns_proxy: null,
  safe_mode: null,
  auto_memory_reclaim: "gradual",
  sparse_vhd: true,
};

const MOCK_WSL_VERSION = {
  wsl_version: "2.3.26.0",
  kernel_version: "5.15.167.4-1",
  wslg_version: "1.0.65",
  windows_version: "10.0.26100.3194",
};

const MOCK_AUDIT_LOG = [
  {
    id: 1,
    timestamp: "2026-02-28T10:00:00Z",
    action: "start_distro",
    target: "Ubuntu",
    details: null,
  },
];

const MOCK_ALERT_THRESHOLDS = [
  { alert_type: "cpu", threshold_percent: 90, enabled: false },
  { alert_type: "memory", threshold_percent: 85, enabled: false },
  { alert_type: "disk", threshold_percent: 90, enabled: false },
];

// ── Fixture ────────────────────────────────────────────────────────

export const test = base.extend<{ tauriPage: Page }>({
  tauriPage: async ({ page }, use) => {
    await page.addInitScript({
      content: `
        const MOCK_DATA = {
          distros: ${JSON.stringify(MOCK_DISTROS)},
          snapshots: ${JSON.stringify(MOCK_SNAPSHOTS)},
          wslConfig: ${JSON.stringify(MOCK_WSL_CONFIG)},
          wslVersion: ${JSON.stringify(MOCK_WSL_VERSION)},
          auditLog: ${JSON.stringify(MOCK_AUDIT_LOG)},
          alertThresholds: ${JSON.stringify(MOCK_ALERT_THRESHOLDS)},
        };

        // ── __TAURI_INTERNALS__ setup ──
        window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
        window.__TAURI_EVENT_PLUGIN_INTERNALS__ = window.__TAURI_EVENT_PLUGIN_INTERNALS__ || {};

        // Window metadata (required for getCurrentWindow())
        window.__TAURI_INTERNALS__.metadata = {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        };

        // Callback registry
        const callbacks = new Map();

        window.__TAURI_INTERNALS__.transformCallback = function (callback, once) {
          const id = window.crypto.getRandomValues(new Uint32Array(1))[0];
          callbacks.set(id, (data) => {
            if (once) callbacks.delete(id);
            return callback && callback(data);
          });
          return id;
        };

        window.__TAURI_INTERNALS__.unregisterCallback = function (id) {
          callbacks.delete(id);
        };

        window.__TAURI_INTERNALS__.runCallback = function (id, data) {
          const cb = callbacks.get(id);
          if (cb) cb(data);
        };

        window.__TAURI_INTERNALS__.callbacks = callbacks;

        // Event listener tracking
        const eventListeners = new Map();

        function handleEventListen(args) {
          if (!eventListeners.has(args.event)) {
            eventListeners.set(args.event, []);
          }
          eventListeners.get(args.event).push(args.handler);
          return args.handler;
        }

        function handleEventEmit(args) {
          const listeners = eventListeners.get(args.event) || [];
          for (const handlerId of listeners) {
            window.__TAURI_INTERNALS__.runCallback(handlerId, {
              event: args.event,
              payload: args.payload,
            });
          }
          return null;
        }

        function handleEventUnlisten(args) {
          const listeners = eventListeners.get(args.event);
          if (listeners) {
            const idx = listeners.indexOf(args.id);
            if (idx !== -1) listeners.splice(idx, 1);
          }
        }

        window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener = function (event, id) {
          window.__TAURI_INTERNALS__.unregisterCallback(id);
        };

        // ── IPC handler ──
        window.__TAURI_INTERNALS__.invoke = async function (cmd, args) {
          // Event plugin
          if (cmd.startsWith("plugin:event|")) {
            switch (cmd) {
              case "plugin:event|listen":   return handleEventListen(args);
              case "plugin:event|emit":     return handleEventEmit(args);
              case "plugin:event|unlisten": return handleEventUnlisten(args);
            }
            return;
          }

          // Window plugin
          if (cmd.startsWith("plugin:window|")) {
            if (cmd === "plugin:window|is_maximized") return false;
            return;
          }

          // Dialog plugin
          if (cmd.startsWith("plugin:dialog|")) {
            if (cmd === "plugin:dialog|open") return "C:\\\\mock\\\\selected-path";
            return null;
          }

          // Application commands
          switch (cmd) {
            case "list_distros":             return MOCK_DATA.distros;
            case "list_snapshots":           return MOCK_DATA.snapshots;
            case "get_wsl_config":           return MOCK_DATA.wslConfig;
            case "get_wsl_version":          return MOCK_DATA.wslVersion;
            case "search_audit_log":         return MOCK_DATA.auditLog;
            case "get_port_forwarding_rules": return [];
            case "list_listening_ports":     return [];
            case "get_alert_thresholds":     return MOCK_DATA.alertThresholds;
            case "get_debug_logs":           return [];
            case "get_processes":            return [];
            case "get_system_metrics":
              return {
                distro_name: args?.distroName || "",
                timestamp: new Date().toISOString(),
                cpu: { usage_percent: 25, per_core: [20, 30], load_average: [0.5, 0.3, 0.2] },
                memory: { total_bytes: 8589934592, used_bytes: 4294967296, available_bytes: 4294967296, cached_bytes: 1073741824, swap_total_bytes: 2147483648, swap_used_bytes: 0 },
                disk: { total_bytes: 107374182400, used_bytes: 53687091200, available_bytes: 53687091200, usage_percent: 50 },
                network: { interfaces: [{ name: "eth0", rx_bytes: 1000000, tx_bytes: 500000, rx_packets: 1000, tx_packets: 500 }] },
              };
            case "get_metrics_history":
              return { distro_name: args?.distroName || "", granularity: "raw", points: [] };

            // Mutations (void)
            case "start_distro":
            case "stop_distro":
            case "restart_distro":
            case "shutdown_all":
            case "set_default_distro":
            case "resize_vhd":
            case "compact_vhdx":
            case "update_wsl_config":
            case "delete_snapshot":
            case "restore_snapshot":
            case "clear_debug_logs":
            case "terminal_write":
            case "terminal_resize":
            case "terminal_close":
            case "remove_port_forwarding":
            case "set_alert_thresholds":
              return;

            case "create_snapshot":
              return { id: "snap-new", distro_name: "Ubuntu", name: "New snapshot", description: null, snapshot_type: "full", format: "tar", file_path: "C:\\\\snapshots\\\\new.tar", file_size_bytes: 1073741824, parent_id: null, created_at: new Date().toISOString(), status: "completed" };
            case "add_port_forwarding":
              return { id: "rule-new", distro_name: args?.distroName || "", wsl_port: args?.wslPort || 0, host_port: args?.hostPort || 0, protocol: "tcp", enabled: true, created_at: new Date().toISOString() };
            case "get_distro_install_path":
              return "C:\\\\Users\\\\user\\\\wsl\\\\" + (args?.name || "distro");
            case "terminal_create":
              return "session-mock-001";
            case "terminal_is_alive":
              return true;

            default:
              console.warn("[E2E Mock] Unhandled Tauri command:", cmd, args);
              return null;
          }
        };

        // Helper for tests to emit mock Tauri events
        window.__E2E_EMIT_TAURI_EVENT__ = function (eventName, payload) {
          const listeners = eventListeners.get(eventName) || [];
          for (const handlerId of listeners) {
            window.__TAURI_INTERNALS__.runCallback(handlerId, {
              event: eventName,
              payload: payload,
            });
          }
        };
      `,
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from "@playwright/test";
