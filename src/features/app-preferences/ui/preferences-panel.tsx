import { useEffect } from "react";
import { Moon, Sun, Timer, Archive, FolderOpen, Bell } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import {
  useAlertThresholds,
  useSetAlertThresholds,
} from "@/features/monitoring-dashboard/api/queries";
import type { AlertThreshold } from "@/shared/types/monitoring";
import { cn } from "@/shared/lib/utils";

const INTERVAL_OPTIONS = [
  { label: "1 second", value: 1000 },
  { label: "2 seconds", value: 2000 },
  { label: "3 seconds", value: 3000 },
  { label: "5 seconds", value: 5000 },
  { label: "10 seconds", value: 10000 },
  { label: "30 seconds", value: 30000 },
];

const selectClass =
  "border-surface-1 bg-base text-text focus:border-blue w-full rounded-lg border px-3 py-2 text-sm focus:outline-none";

export function PreferencesPanel() {
  const { theme, toggleTheme } = useThemeStore();
  const {
    metricsInterval,
    processesInterval,
    defaultSnapshotDir,
    defaultInstallLocation,
    alertThresholds,
    setMetricsInterval,
    setProcessesInterval,
    setDefaultSnapshotDir,
    setDefaultInstallLocation,
    setAlertThresholds,
  } = usePreferencesStore();

  // Sync thresholds from backend on mount
  const { data: backendThresholds } = useAlertThresholds();
  const setBackendThresholds = useSetAlertThresholds();

  useEffect(() => {
    if (backendThresholds && backendThresholds.length > 0) {
      setAlertThresholds(backendThresholds);
    }
  }, [backendThresholds, setAlertThresholds]);

  const updateThreshold = (alertType: string, updates: Partial<AlertThreshold>) => {
    const next = alertThresholds.map((t) =>
      t.alert_type === alertType ? { ...t, ...updates } : t,
    );
    setAlertThresholds(next);
    setBackendThresholds.mutate(next);
  };

  return (
    <div className="space-y-6">
      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <h4 className="text-text mb-4 font-semibold">Appearance</h4>
        <div className="flex gap-3">
          <button
            onClick={() => theme === "light" && toggleTheme()}
            className={cn(
              "flex flex-1 items-center gap-3 rounded-lg border p-4 transition-all",
              theme === "dark"
                ? "border-blue bg-blue/10"
                : "border-surface-1 hover:border-surface-2",
            )}
          >
            <Moon className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="text-text text-sm font-medium">Mocha (Dark)</p>
              <p className="text-subtext-0 text-xs">Dark theme with warm tones</p>
            </div>
          </button>
          <button
            onClick={() => theme === "dark" && toggleTheme()}
            className={cn(
              "flex flex-1 items-center gap-3 rounded-lg border p-4 transition-all",
              theme === "light"
                ? "border-blue bg-blue/10"
                : "border-surface-1 hover:border-surface-2",
            )}
          >
            <Sun className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="text-text text-sm font-medium">Latte (Light)</p>
              <p className="text-subtext-0 text-xs">Light theme for bright environments</p>
            </div>
          </button>
        </div>
      </div>

      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Timer className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">Monitoring</h4>
        </div>
        <p className="text-subtext-0 mb-4 text-xs">
          Adjust how often metrics are polled from running distributions.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              System Metrics Interval
            </label>
            <select
              value={metricsInterval}
              onChange={(e) => setMetricsInterval(Number(e.target.value))}
              className={selectClass}
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              Process List Interval
            </label>
            <select
              value={processesInterval}
              onChange={(e) => setProcessesInterval(Number(e.target.value))}
              className={selectClass}
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Archive className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">Snapshots</h4>
        </div>
        <p className="text-subtext-0 mb-4 text-xs">
          Default directories used when creating or restoring snapshots.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              Default Snapshot Directory
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={defaultSnapshotDir}
                onChange={(e) => setDefaultSnapshotDir(e.target.value)}
                placeholder="C:\WSL-Snapshots"
                className={`${selectClass} flex-1`}
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await openDialog({
                    directory: true,
                    title: "Select default snapshot directory",
                  });
                  if (dir) setDefaultSnapshotDir(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                aria-label="Browse snapshot directory"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
            <p className="text-overlay-0 mt-1 text-xs">
              Where snapshot files (.tar, .vhdx) are saved by default.
            </p>
          </div>
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              Default Install Location
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={defaultInstallLocation}
                onChange={(e) => setDefaultInstallLocation(e.target.value)}
                placeholder="C:\WSL"
                className={`${selectClass} flex-1`}
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await openDialog({
                    directory: true,
                    title: "Select default install location",
                  });
                  if (dir) setDefaultInstallLocation(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                aria-label="Browse install location"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
            <p className="text-overlay-0 mt-1 text-xs">
              Where restored distributions are installed by default.
            </p>
          </div>
        </div>
      </div>

      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">Alerts</h4>
        </div>
        <p className="text-subtext-0 mb-4 text-xs">
          Configure thresholds for desktop notifications when resource usage is high.
        </p>
        <div className="space-y-4">
          {alertThresholds.map((threshold) => {
            const label =
              threshold.alert_type === "cpu"
                ? "CPU"
                : threshold.alert_type === "memory"
                  ? "Memory"
                  : "Disk";
            return (
              <div key={threshold.alert_type} className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    updateThreshold(threshold.alert_type, { enabled: !threshold.enabled })
                  }
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    threshold.enabled ? "bg-blue" : "bg-surface-1",
                  )}
                  aria-label={`Toggle ${label} alert`}
                >
                  <span
                    className={cn(
                      "bg-text absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform",
                      threshold.enabled && "translate-x-5",
                    )}
                  />
                </button>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-text text-sm font-medium">{label}</span>
                    <span className="text-subtext-0 text-xs">{threshold.threshold_percent}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={99}
                    value={threshold.threshold_percent}
                    onChange={(e) =>
                      updateThreshold(threshold.alert_type, {
                        threshold_percent: Number(e.target.value),
                      })
                    }
                    disabled={!threshold.enabled}
                    className="w-full accent-[var(--color-blue)] disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
