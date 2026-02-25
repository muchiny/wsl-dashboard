import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { snapshotKeys, useSnapshots, useSnapshotCounts } from "./queries";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("snapshotKeys", () => {
  it("all returns base key", () => {
    expect(snapshotKeys.all).toEqual(["snapshots"]);
  });

  it("list without filter uses 'all'", () => {
    expect(snapshotKeys.list()).toEqual(["snapshots", "list", "all"]);
  });

  it("list with filter uses distro name", () => {
    expect(snapshotKeys.list("Ubuntu")).toEqual(["snapshots", "list", "Ubuntu"]);
  });
});

describe("useSnapshots", () => {
  it("invokes list_snapshots with null filter", async () => {
    mockInvoke.mockResolvedValue([]);

    const { result } = renderHook(() => useSnapshots(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("list_snapshots", {
      distroName: null,
    });
  });

  it("invokes list_snapshots with distro filter", async () => {
    mockInvoke.mockResolvedValue([]);

    const { result } = renderHook(() => useSnapshots("Ubuntu"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("list_snapshots", {
      distroName: "Ubuntu",
    });
  });
});

describe("useSnapshotCounts", () => {
  it("returns empty object when no snapshots", async () => {
    mockInvoke.mockResolvedValue([]);

    const { result } = renderHook(() => useSnapshotCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toEqual({}));
  });

  it("counts snapshots per distro", async () => {
    mockInvoke.mockResolvedValue([
      { distro_name: "Ubuntu", id: "1", name: "s1", status: "completed" },
      { distro_name: "Ubuntu", id: "2", name: "s2", status: "completed" },
      { distro_name: "Debian", id: "3", name: "s3", status: "completed" },
    ]);

    const { result } = renderHook(() => useSnapshotCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toEqual({ Ubuntu: 2, Debian: 1 }));
  });
});
