import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesStore {
  metricsInterval: number;
  processesInterval: number;
  defaultSnapshotDir: string;
  defaultInstallLocation: string;
  setMetricsInterval: (ms: number) => void;
  setProcessesInterval: (ms: number) => void;
  setDefaultSnapshotDir: (path: string) => void;
  setDefaultInstallLocation: (path: string) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      metricsInterval: 2000,
      processesInterval: 3000,
      defaultSnapshotDir: "",
      defaultInstallLocation: "",
      setMetricsInterval: (ms) => set({ metricsInterval: ms }),
      setProcessesInterval: (ms) => set({ processesInterval: ms }),
      setDefaultSnapshotDir: (path) => set({ defaultSnapshotDir: path }),
      setDefaultInstallLocation: (path) => set({ defaultInstallLocation: path }),
    }),
    { name: "wsl-nexus-preferences" },
  ),
);
