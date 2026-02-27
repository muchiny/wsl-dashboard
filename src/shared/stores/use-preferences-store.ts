import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AlertThreshold } from "@/shared/types/monitoring";

export type SortKey =
  | "name-asc"
  | "name-desc"
  | "status-running"
  | "status-stopped"
  | "vhdx-size"
  | "default-first";

export type ViewMode = "grid" | "list";

interface PreferencesStore {
  metricsInterval: number;
  processesInterval: number;
  defaultSnapshotDir: string;
  defaultInstallLocation: string;
  sortKey: SortKey;
  viewMode: ViewMode;
  alertThresholds: AlertThreshold[];
  setMetricsInterval: (ms: number) => void;
  setProcessesInterval: (ms: number) => void;
  setDefaultSnapshotDir: (path: string) => void;
  setDefaultInstallLocation: (path: string) => void;
  setSortKey: (key: SortKey) => void;
  setViewMode: (mode: ViewMode) => void;
  setAlertThresholds: (thresholds: AlertThreshold[]) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      metricsInterval: 2000,
      processesInterval: 3000,
      defaultSnapshotDir: "",
      defaultInstallLocation: "",
      sortKey: "name-asc",
      viewMode: "grid",
      alertThresholds: [
        { alert_type: "cpu", threshold_percent: 90, enabled: true },
        { alert_type: "memory", threshold_percent: 85, enabled: true },
        { alert_type: "disk", threshold_percent: 90, enabled: true },
      ],
      setMetricsInterval: (ms) => set({ metricsInterval: ms }),
      setProcessesInterval: (ms) => set({ processesInterval: ms }),
      setDefaultSnapshotDir: (path) => set({ defaultSnapshotDir: path }),
      setDefaultInstallLocation: (path) => set({ defaultInstallLocation: path }),
      setSortKey: (key) => set({ sortKey: key }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setAlertThresholds: (thresholds) => set({ alertThresholds: thresholds }),
    }),
    { name: "wsl-nexus-preferences" },
  ),
);
