import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useLiveMetrics } from "./use-live-metrics";

vi.mock("@/shared/hooks/use-tauri-event");
vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn().mockRejectedValue(new Error("not available")),
}));

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
});
