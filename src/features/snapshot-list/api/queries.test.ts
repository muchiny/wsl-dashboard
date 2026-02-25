import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { snapshotKeys, useSnapshots } from "./queries";

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
