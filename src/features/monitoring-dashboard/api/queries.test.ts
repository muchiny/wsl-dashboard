import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { monitoringKeys, useProcesses, useMetricsHistory, useAlertThresholds } from "./queries";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("monitoringKeys", () => {
  it("metrics key includes distro name", () => {
    expect(monitoringKeys.metrics("Ubuntu")).toEqual(["monitoring", "metrics", "Ubuntu"]);
  });

  it("processes key includes distro name", () => {
    expect(monitoringKeys.processes("Ubuntu")).toEqual(["monitoring", "processes", "Ubuntu"]);
  });

  it("history key includes distro and range", () => {
    expect(monitoringKeys.history("Ubuntu", "1h")).toEqual([
      "monitoring",
      "history",
      "Ubuntu",
      "1h",
    ]);
  });

  it("alertThresholds key", () => {
    expect(monitoringKeys.alertThresholds()).toEqual(["monitoring", "alertThresholds"]);
  });

  it("alerts key includes distro", () => {
    expect(monitoringKeys.alerts("Ubuntu")).toEqual(["monitoring", "alerts", "Ubuntu"]);
  });

  it("all key is base", () => {
    expect(monitoringKeys.all).toEqual(["monitoring"]);
  });
});

describe("useProcesses", () => {
  it("invokes get_processes with distro", async () => {
    mockInvoke.mockResolvedValue([]);

    const { result } = renderHook(() => useProcesses("Ubuntu"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("get_processes", {
      distroName: "Ubuntu",
    });
  });

  it("does not fetch when distro is null", () => {
    const { result } = renderHook(() => useProcesses(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() => useProcesses("Ubuntu", false), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useMetricsHistory", () => {
  it("does not fetch when distro is null", () => {
    const { result } = renderHook(() => useMetricsHistory(null, "1h"), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
  });

  it("does not fetch in live mode", () => {
    const { result } = renderHook(() => useMetricsHistory("Ubuntu", "live"), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
  });

  it("fetches history for 1h range", async () => {
    mockInvoke.mockResolvedValue({
      distro_name: "Ubuntu",
      granularity: "raw",
      points: [],
    });
    const { result } = renderHook(() => useMetricsHistory("Ubuntu", "1h"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith(
      "get_metrics_history",
      expect.objectContaining({
        distroName: "Ubuntu",
      }),
    );
  });
});

describe("useAlertThresholds", () => {
  it("fetches alert thresholds", async () => {
    const mockThresholds = [{ alert_type: "cpu", threshold_percent: 90, enabled: true }];
    mockInvoke.mockResolvedValue(mockThresholds);
    const { result } = renderHook(() => useAlertThresholds(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockThresholds);
  });
});
