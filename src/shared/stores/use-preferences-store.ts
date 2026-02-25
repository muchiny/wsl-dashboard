import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesStore {
  metricsInterval: number;
  processesInterval: number;
  setMetricsInterval: (ms: number) => void;
  setProcessesInterval: (ms: number) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      metricsInterval: 2000,
      processesInterval: 3000,
      setMetricsInterval: (ms) => set({ metricsInterval: ms }),
      setProcessesInterval: (ms) => set({ processesInterval: ms }),
    }),
    { name: "wsl-nexus-preferences" },
  ),
);
