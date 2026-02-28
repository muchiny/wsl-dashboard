import { describe, it, expect, beforeEach } from "vitest";
import { usePreferencesStore } from "./use-preferences-store";
import type { AlertThreshold } from "@/shared/types/monitoring";

describe("usePreferencesStore", () => {
  beforeEach(() => {
    // Reset to initial state before each test
    const { setState } = usePreferencesStore;
    setState({
      metricsInterval: 2000,
      processesInterval: 3000,
      defaultSnapshotDir: "",
      defaultInstallLocation: "",
      sortKey: "name-asc",
      viewMode: "grid",
      alertThresholds: [
        { alert_type: "cpu", threshold_percent: 90, enabled: false },
        { alert_type: "memory", threshold_percent: 85, enabled: false },
        { alert_type: "disk", threshold_percent: 90, enabled: false },
      ],
    });
  });

  describe("default values", () => {
    it("has correct default metricsInterval", () => {
      expect(usePreferencesStore.getState().metricsInterval).toBe(2000);
    });

    it("has correct default processesInterval", () => {
      expect(usePreferencesStore.getState().processesInterval).toBe(3000);
    });

    it("has empty default snapshot dir", () => {
      expect(usePreferencesStore.getState().defaultSnapshotDir).toBe("");
    });

    it("has empty default install location", () => {
      expect(usePreferencesStore.getState().defaultInstallLocation).toBe("");
    });

    it("defaults to name-asc sort", () => {
      expect(usePreferencesStore.getState().sortKey).toBe("name-asc");
    });

    it("defaults to grid view", () => {
      expect(usePreferencesStore.getState().viewMode).toBe("grid");
    });

    it("has 3 default alert thresholds", () => {
      const thresholds = usePreferencesStore.getState().alertThresholds;
      expect(thresholds).toHaveLength(3);
      expect(thresholds[0]).toEqual({ alert_type: "cpu", threshold_percent: 90, enabled: false });
      expect(thresholds[1]).toEqual({
        alert_type: "memory",
        threshold_percent: 85,
        enabled: false,
      });
      expect(thresholds[2]).toEqual({ alert_type: "disk", threshold_percent: 90, enabled: false });
    });
  });

  describe("setters", () => {
    it("setMetricsInterval updates interval", () => {
      usePreferencesStore.getState().setMetricsInterval(5000);
      expect(usePreferencesStore.getState().metricsInterval).toBe(5000);
    });

    it("setProcessesInterval updates interval", () => {
      usePreferencesStore.getState().setProcessesInterval(10000);
      expect(usePreferencesStore.getState().processesInterval).toBe(10000);
    });

    it("setDefaultSnapshotDir updates path", () => {
      usePreferencesStore.getState().setDefaultSnapshotDir("/tmp/snapshots");
      expect(usePreferencesStore.getState().defaultSnapshotDir).toBe("/tmp/snapshots");
    });

    it("setDefaultInstallLocation updates path", () => {
      usePreferencesStore.getState().setDefaultInstallLocation("C:\\WSL");
      expect(usePreferencesStore.getState().defaultInstallLocation).toBe("C:\\WSL");
    });

    it("setSortKey updates sort key", () => {
      usePreferencesStore.getState().setSortKey("status-running");
      expect(usePreferencesStore.getState().sortKey).toBe("status-running");
    });

    it("setViewMode toggles between grid and list", () => {
      usePreferencesStore.getState().setViewMode("list");
      expect(usePreferencesStore.getState().viewMode).toBe("list");
      usePreferencesStore.getState().setViewMode("grid");
      expect(usePreferencesStore.getState().viewMode).toBe("grid");
    });

    it("setAlertThresholds replaces all thresholds", () => {
      const newThresholds: AlertThreshold[] = [
        { alert_type: "cpu", threshold_percent: 95, enabled: false },
      ];
      usePreferencesStore.getState().setAlertThresholds(newThresholds);
      expect(usePreferencesStore.getState().alertThresholds).toEqual(newThresholds);
    });
  });

  describe("state independence", () => {
    it("changing one field does not affect others", () => {
      usePreferencesStore.getState().setMetricsInterval(9999);
      expect(usePreferencesStore.getState().processesInterval).toBe(3000);
      expect(usePreferencesStore.getState().sortKey).toBe("name-asc");
      expect(usePreferencesStore.getState().viewMode).toBe("grid");
    });
  });
});
