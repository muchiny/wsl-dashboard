import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useLiveMetrics } from "./use-live-metrics";
import type { SystemMetrics } from "@/shared/types/monitoring";

vi.mock("@/shared/hooks/use-tauri-event");
vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn().mockRejectedValue(new Error("not available")),
}));

function makeMetrics(distroName: string, network?: { rx: number; tx: number }): SystemMetrics {
  return {
    distro_name: distroName,
    timestamp: new Date().toISOString(),
    cpu: {
      usage_percent: 25,
      per_core: [25],
      load_average: [0.5, 0.3, 0.1] as [number, number, number],
    },
    memory: {
      total_bytes: 8_000_000_000,
      used_bytes: 4_000_000_000,
      available_bytes: 4_000_000_000,
      cached_bytes: 1_000_000_000,
      swap_total_bytes: 0,
      swap_used_bytes: 0,
    },
    disk: {
      total_bytes: 100_000_000_000,
      used_bytes: 50_000_000_000,
      available_bytes: 50_000_000_000,
      usage_percent: 50,
    },
    network: {
      interfaces: [
        {
          name: "eth0",
          rx_bytes: network?.rx ?? 0,
          tx_bytes: network?.tx ?? 0,
          rx_packets: 0,
          tx_packets: 0,
        },
      ],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useLiveMetrics", () => {
  it("returns empty history initially", () => {
    const { result } = renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    expect(result.current.history).toEqual([]);
  });

  it("returns null latestMetrics initially", () => {
    const { result } = renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    expect(result.current.latestMetrics).toBeNull();
  });

  it("captures callback from useTauriEvent for system-metrics event", async () => {
    const { useTauriEvent } = await import("@/shared/hooks/use-tauri-event");
    const mockUseTauriEvent = vi.mocked(useTauriEvent);

    renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    expect(mockUseTauriEvent).toHaveBeenCalledWith("system-metrics", expect.any(Function));
  });

  it("processes metrics event and adds to history", async () => {
    const { useTauriEvent } = await import("@/shared/hooks/use-tauri-event");
    const mockUseTauriEvent = vi.mocked(useTauriEvent);

    const { result } = renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    // Get the handler that was passed to useTauriEvent
    const handler = mockUseTauriEvent.mock.calls[0]![1];

    // Simulate a metrics event
    act(() => {
      handler(makeMetrics("Ubuntu"));
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.latestMetrics).not.toBeNull();
  });

  it("filters events for wrong distro", async () => {
    const { useTauriEvent } = await import("@/shared/hooks/use-tauri-event");
    const mockUseTauriEvent = vi.mocked(useTauriEvent);

    const { result } = renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    const handler = mockUseTauriEvent.mock.calls[0]![1];

    act(() => {
      handler(makeMetrics("Debian")); // wrong distro
    });

    expect(result.current.history).toHaveLength(0);
  });

  it("computes network rates from consecutive samples", async () => {
    const { useTauriEvent } = await import("@/shared/hooks/use-tauri-event");
    const mockUseTauriEvent = vi.mocked(useTauriEvent);

    const { result } = renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    const handler = mockUseTauriEvent.mock.calls[0]![1];

    // First sample - no previous, so rates should be 0
    act(() => {
      handler(makeMetrics("Ubuntu", { rx: 1000, tx: 500 }));
    });
    expect(result.current.history[0]!.netRx).toBe(0);
    expect(result.current.history[0]!.netTx).toBe(0);

    // Second sample - should calculate rates
    act(() => {
      handler(makeMetrics("Ubuntu", { rx: 3000, tx: 1500 }));
    });
    expect(result.current.history[1]!.netRx).toBe(1000); // (3000-1000)/2
    expect(result.current.history[1]!.netTx).toBe(500); // (1500-500)/2
  });

  it("clears history when distro changes", () => {
    const { result, rerender } = renderHook(({ distro }) => useLiveMetrics(distro), {
      wrapper: createWrapper(),
      initialProps: { distro: "Ubuntu" as string | null },
    });

    // Rerender with a different distro
    rerender({ distro: "Debian" });
    expect(result.current.history).toEqual([]);
    expect(result.current.latestMetrics).toBeNull();
  });

  it("returns empty history when distro is null", () => {
    const { result } = renderHook(() => useLiveMetrics(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.history).toEqual([]);
    expect(result.current.latestMetrics).toBeNull();
  });

  it("correctly maps CPU and memory fields into MetricsPoint", async () => {
    const { useTauriEvent } = await import("@/shared/hooks/use-tauri-event");
    const mockUseTauriEvent = vi.mocked(useTauriEvent);

    const { result } = renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    const handler = mockUseTauriEvent.mock.calls[0]![1];

    act(() => {
      handler(makeMetrics("Ubuntu"));
    });

    const point = result.current.history[0]!;
    expect(point.cpu).toBe(25);
    expect(point.memUsed).toBe(4_000_000_000);
    expect(point.memTotal).toBe(8_000_000_000);
    expect(point.memPercent).toBe(50);
    expect(point.diskPercent).toBe(50);
  });

  it("caps history at MAX_POINTS (60)", async () => {
    const { useTauriEvent } = await import("@/shared/hooks/use-tauri-event");
    const mockUseTauriEvent = vi.mocked(useTauriEvent);

    const { result } = renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    const handler = mockUseTauriEvent.mock.calls[0]![1];

    // Add 65 data points
    act(() => {
      for (let i = 0; i < 65; i++) {
        handler(makeMetrics("Ubuntu"));
      }
    });

    expect(result.current.history).toHaveLength(60);
  });

  it("ignores events when distro is null", async () => {
    const { useTauriEvent } = await import("@/shared/hooks/use-tauri-event");
    const mockUseTauriEvent = vi.mocked(useTauriEvent);

    const { result } = renderHook(() => useLiveMetrics(null), {
      wrapper: createWrapper(),
    });

    const handler = mockUseTauriEvent.mock.calls[0]![1];

    act(() => {
      handler(makeMetrics("Ubuntu"));
    });

    expect(result.current.history).toHaveLength(0);
    expect(result.current.latestMetrics).toBeNull();
  });

  it("fires bootstrap fetch on mount for immediate data", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");

    renderHook(() => useLiveMetrics("Ubuntu"), {
      wrapper: createWrapper(),
    });

    expect(tauriInvoke).toHaveBeenCalledWith("get_system_metrics", {
      distroName: "Ubuntu",
    });
  });

  it("does not fire bootstrap fetch when distro is null", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");

    renderHook(() => useLiveMetrics(null), {
      wrapper: createWrapper(),
    });

    expect(tauriInvoke).not.toHaveBeenCalled();
  });
});
