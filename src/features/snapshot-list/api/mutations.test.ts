import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { useCreateSnapshot, useDeleteSnapshot, useRestoreSnapshot } from "./mutations";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("useCreateSnapshot", () => {
  it("invokes create_snapshot with args", async () => {
    mockInvoke.mockResolvedValue({
      id: "snap-1",
      distro_name: "Ubuntu",
      name: "my-snapshot",
      description: null,
      snapshot_type: "full",
      format: "tar",
      file_path: "/snapshots/my-snapshot.tar",
      file_size_bytes: 1024,
      parent_id: null,
      created_at: "2026-02-25T00:00:00Z",
      status: "completed",
    });

    const { result } = renderHook(() => useCreateSnapshot(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        distro_name: "Ubuntu",
        name: "my-snapshot",
        output_dir: "/snapshots",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("create_snapshot", {
      args: {
        distro_name: "Ubuntu",
        name: "my-snapshot",
        output_dir: "/snapshots",
      },
    });
  });
});

describe("useDeleteSnapshot", () => {
  it("invokes delete_snapshot with snapshotId", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteSnapshot(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate("snap-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("delete_snapshot", {
      snapshotId: "snap-1",
    });
  });
});

describe("useRestoreSnapshot", () => {
  it("invokes restore_snapshot with args", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRestoreSnapshot(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        snapshot_id: "snap-1",
        mode: "clone",
        new_name: "Ubuntu-Clone",
        install_location: "/wsl/Ubuntu-Clone",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("restore_snapshot", {
      args: {
        snapshot_id: "snap-1",
        mode: "clone",
        new_name: "Ubuntu-Clone",
        install_location: "/wsl/Ubuntu-Clone",
      },
    });
  });
});
