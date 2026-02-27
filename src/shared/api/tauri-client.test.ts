import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockInvoke } from "@/test/mocks/tauri";
import { tauriInvoke } from "./tauri-client";

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
