import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockInvoke } from "@/test/mocks/tauri";
import { tauriInvoke, TauriError } from "./tauri-client";

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

  it("wraps string error in TauriError", async () => {
    mockInvoke.mockRejectedValueOnce("Distro not found");
    await expect(tauriInvoke("get_distro")).rejects.toThrow(TauriError);
    await mockInvoke.mockRejectedValueOnce("Distro not found");
    await expect(tauriInvoke("get_distro")).rejects.toThrow("Distro not found");
  });

  it("wraps object error in TauriError", async () => {
    mockInvoke.mockRejectedValueOnce({ code: 500 });
    await expect(tauriInvoke("fail")).rejects.toThrow(TauriError);
  });
});

describe("TauriError", () => {
  it("has correct name", () => {
    const err = new TauriError("test");
    expect(err.name).toBe("TauriError");
    expect(err.message).toBe("test");
  });
});
