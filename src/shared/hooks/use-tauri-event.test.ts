import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { mockListen } from "@/test/mocks/tauri";
import { useTauriEvent } from "./use-tauri-event";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTauriEvent", () => {
  it("calls listen with event name", () => {
    const handler = vi.fn();
    renderHook(() => useTauriEvent("test-event", handler));
    expect(mockListen).toHaveBeenCalledWith("test-event", expect.any(Function));
  });

  it("calls unlisten on unmount", async () => {
    const unlistenFn = vi.fn();
    mockListen.mockResolvedValueOnce(unlistenFn);

    const handler = vi.fn();
    const { unmount } = renderHook(() => useTauriEvent("test-event", handler));
    unmount();

    // Wait for the promise to resolve
    await vi.waitFor(() => {
      expect(unlistenFn).toHaveBeenCalled();
    });
  });

  it("passes payload to handler via listener callback", () => {
    const handler = vi.fn();
    let capturedCallback: ((event: { payload: unknown }) => void) | undefined;
    mockListen.mockImplementation((_event: string, cb: (event: { payload: unknown }) => void) => {
      capturedCallback = cb;
      return Promise.resolve(vi.fn());
    });

    renderHook(() => useTauriEvent("test-event", handler));

    // Simulate event
    capturedCallback!({ payload: { data: "test" } });
    expect(handler).toHaveBeenCalledWith({ data: "test" });
  });
});
