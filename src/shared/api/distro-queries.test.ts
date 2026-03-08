import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { distroKeys, useDistros } from "./distro-queries";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { Distro } from "@/shared/types/distro";

vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn(),
}));

describe("distroKeys", () => {
  it("returns correct 'all' key", () => {
    expect(distroKeys.all).toEqual(["distros"]);
  });

  it("returns correct 'list' key", () => {
    expect(distroKeys.list()).toEqual(["distros", "list"]);
  });
});

describe("useDistros", () => {
  it("fetches distros via tauriInvoke", async () => {
    const mockDistros: Distro[] = [
      {
        name: "Ubuntu",
        state: "Running",
        wsl_version: 2,
        is_default: true,
        base_path: null,
        vhdx_size_bytes: null,
        last_seen: "2026-01-01",
      },
    ];

    vi.mocked(tauriInvoke).mockResolvedValue(mockDistros);

    const { result } = renderHook(() => useDistros(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(tauriInvoke).toHaveBeenCalledWith("list_distros");
    expect(result.current.data).toEqual(mockDistros);
  });
});
