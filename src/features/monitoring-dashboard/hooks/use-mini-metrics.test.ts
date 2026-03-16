import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";

let capturedCallback: ((event: { payload: unknown }) => void) | undefined;
const mockUnlisten = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((_event: string, cb: (event: { payload: unknown }) => void) => {
    capturedCallback = cb;
    return Promise.resolve(mockUnlisten);
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  capturedCallback = undefined;
  // Reset the module-level store by re-importing
  vi.resetModules();
});

describe("useMiniMetrics", () => {
  it("returns null for an unknown distro", async () => {
    const { useMiniMetrics } = await import("./use-mini-metrics");
    const { result } = renderHook(() => useMiniMetrics("unknown-distro"));
    expect(result.current).toBeNull();
  });

  it("returns metrics after receiving event", async () => {
    const { useMiniMetrics } = await import("./use-mini-metrics");
    const { result } = renderHook(() => useMiniMetrics("Ubuntu"));

    // Wait for listen promise to resolve
    await vi.waitFor(() => {
      expect(capturedCallback).toBeDefined();
    });

    act(() => {
      capturedCallback!({
        payload: {
          distro_name: "Ubuntu",
          cpu: { usage_percent: 42.5, per_core: [40, 45] },
          memory: { total_bytes: 8000, used_bytes: 4000 },
        },
      });
    });

    expect(result.current).not.toBeNull();
    expect(result.current!.cpuCurrent).toBe(42.5);
    expect(result.current!.cpuHistory).toEqual([42.5]);
    expect(result.current!.memPercent).toBe(50);
    expect(result.current!.perCore).toEqual([40, 45]);
    expect(result.current!.perCoreHistory).toEqual([[40], [45]]);
  });

  it("still returns null for different distro after event", async () => {
    const { useMiniMetrics } = await import("./use-mini-metrics");
    const { result } = renderHook(() => useMiniMetrics("Debian"));

    await vi.waitFor(() => {
      expect(capturedCallback).toBeDefined();
    });

    act(() => {
      capturedCallback!({
        payload: {
          distro_name: "Ubuntu",
          cpu: { usage_percent: 50, per_core: [50] },
          memory: { total_bytes: 8000, used_bytes: 4000 },
        },
      });
    });

    expect(result.current).toBeNull();
  });
});
