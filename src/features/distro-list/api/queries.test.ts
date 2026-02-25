import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { distroKeys, useDistros, useDistroDetails } from "./queries";
import type { Distro } from "@/shared/types/distro";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("distroKeys", () => {
  it("all returns base key", () => {
    expect(distroKeys.all).toEqual(["distros"]);
  });

  it("list returns list key", () => {
    expect(distroKeys.list()).toEqual(["distros", "list"]);
  });

  it("detail returns detail key with name", () => {
    expect(distroKeys.detail("Ubuntu")).toEqual(["distros", "detail", "Ubuntu"]);
  });
});

describe("useDistros", () => {
  it("invokes list_distros command", async () => {
    const distros: Distro[] = [
      {
        name: "Ubuntu",
        state: "Running",
        wsl_version: 2,
        is_default: true,
        base_path: null,
        vhdx_size_bytes: null,
        last_seen: "2024-01-01T00:00:00Z",
      },
    ];
    mockInvoke.mockResolvedValue(distros);

    const { result } = renderHook(() => useDistros(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("list_distros", undefined);
    expect(result.current.data).toEqual(distros);
  });
});

describe("useDistroDetails", () => {
  it("is disabled when name is null", () => {
    const { result } = renderHook(() => useDistroDetails(null), {
      wrapper: createWrapper(),
    });
    // Query should not fetch
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("invokes get_distro_details with name", async () => {
    const detail = { name: "Ubuntu", state: "Running", wsl_version: 2 };
    mockInvoke.mockResolvedValue(detail);

    const { result } = renderHook(() => useDistroDetails("Ubuntu"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("get_distro_details", {
      name: "Ubuntu",
    });
  });
});
