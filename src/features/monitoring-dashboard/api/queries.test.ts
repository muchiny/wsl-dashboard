import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { monitoringKeys, useSystemMetrics, useProcesses } from "./queries";

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
});

describe("useSystemMetrics", () => {
  it("is disabled when distroName is null", () => {
    const { result } = renderHook(() => useSystemMetrics(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("invokes get_system_metrics with distro", async () => {
    const metrics = { distro_name: "Ubuntu", cpu: {}, memory: {} };
    mockInvoke.mockResolvedValue(metrics);

    const { result } = renderHook(() => useSystemMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("get_system_metrics", {
      distroName: "Ubuntu",
    });
  });

  it("is disabled when enabled=false", () => {
    const { result } = renderHook(() => useSystemMetrics("Ubuntu", false), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
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
});
