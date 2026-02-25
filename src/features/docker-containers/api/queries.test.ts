import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { dockerKeys, useDockerStatus } from "./queries";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("dockerKeys", () => {
  it("all returns base key", () => {
    expect(dockerKeys.all).toEqual(["docker"]);
  });

  it("status key includes distro name", () => {
    expect(dockerKeys.status("Ubuntu")).toEqual(["docker", "status", "Ubuntu"]);
  });
});

describe("useDockerStatus", () => {
  it("is disabled when distroName is null", () => {
    const { result } = renderHook(() => useDockerStatus(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("invokes get_docker_status with distro", async () => {
    const status = { available: true, containers: [], images: [] };
    mockInvoke.mockResolvedValue(status);

    const { result } = renderHook(() => useDockerStatus("Ubuntu"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("get_docker_status", {
      distroName: "Ubuntu",
    });
  });
});
