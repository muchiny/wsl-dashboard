import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { monitoringKeys, useProcesses } from "./queries";

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
