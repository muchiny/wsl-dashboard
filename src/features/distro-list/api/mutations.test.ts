import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { useStartDistro, useStopDistro, useRestartDistro, useShutdownAll } from "./mutations";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("useStartDistro", () => {
  it("invokes start_distro with name", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStartDistro(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate("Ubuntu");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("start_distro", {
      name: "Ubuntu",
    });
  });
});

describe("useStopDistro", () => {
  it("invokes stop_distro with name", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStopDistro(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate("Ubuntu");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("stop_distro", {
      name: "Ubuntu",
    });
  });
});

describe("useRestartDistro", () => {
  it("invokes restart_distro with name", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRestartDistro(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate("Ubuntu");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("restart_distro", {
      name: "Ubuntu",
    });
  });
});

describe("useShutdownAll", () => {
  it("invokes shutdown_all", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useShutdownAll(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("shutdown_all", undefined);
  });
});
