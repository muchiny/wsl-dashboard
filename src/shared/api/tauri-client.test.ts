import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockInvoke } from "@/test/mocks/tauri";
import { tauriInvoke, onIpcTiming } from "./tauri-client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tauriInvoke", () => {
  it("returns data on success", async () => {
    mockInvoke.mockResolvedValueOnce({ name: "Ubuntu" });
    const result = await tauriInvoke<{ name: string }>("list_distros");
    expect(result).toEqual({ name: "Ubuntu" });
  });

  it("passes args to invoke", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await tauriInvoke("start_distro", { name: "Ubuntu" });
    expect(mockInvoke).toHaveBeenCalledWith("start_distro", { name: "Ubuntu" });
  });

  it("wraps string error in Error", async () => {
    mockInvoke.mockRejectedValueOnce("Distro not found");
    await expect(tauriInvoke("get_distro")).rejects.toThrow(Error);
    await mockInvoke.mockRejectedValueOnce("Distro not found");
    await expect(tauriInvoke("get_distro")).rejects.toThrow("Distro not found");
  });

  it("wraps object error in Error", async () => {
    mockInvoke.mockRejectedValueOnce({ code: 500 });
    await expect(tauriInvoke("fail")).rejects.toThrow(Error);
  });
});

describe("onIpcTiming", () => {
  beforeEach(() => {
    // Reset the timing callback by setting a new one
    onIpcTiming(() => {});
  });

  it("registers callback that is called on success", async () => {
    const timingCallback = vi.fn();
    onIpcTiming(timingCallback);
    mockInvoke.mockResolvedValueOnce("ok");
    await tauriInvoke("test_cmd");
    expect(timingCallback).toHaveBeenCalledOnce();
    expect(timingCallback).toHaveBeenCalledWith("test_cmd", expect.any(Number), true);
  });

  it("registers callback that is called on error", async () => {
    const timingCallback = vi.fn();
    onIpcTiming(timingCallback);
    mockInvoke.mockRejectedValueOnce("fail");
    await expect(tauriInvoke("bad_cmd")).rejects.toThrow();
    expect(timingCallback).toHaveBeenCalledOnce();
    expect(timingCallback).toHaveBeenCalledWith("bad_cmd", expect.any(Number), false);
  });
});
