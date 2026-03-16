import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useUpdateWslConfig, useCompactVhdx } from "./mutations";
import { tauriInvoke } from "@/shared/api/tauri-client";

vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpdateWslConfig", () => {
  it("returns a mutation object", () => {
    const { result } = renderHook(() => useUpdateWslConfig(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();
    expect(result.current.mutate).toBeTypeOf("function");
    expect(result.current.isPending).toBe(false);
  });

  it("calls tauriInvoke with update_wsl_config and the config", async () => {
    vi.mocked(tauriInvoke).mockResolvedValue(undefined);
    const config = {
      memory: "4GB",
      processors: 4,
      swap: null,
      swap_file: null,
      localhost_forwarding: true,
      kernel: null,
      kernel_command_line: null,
      nested_virtualization: false,
      vm_idle_timeout: null,
      dns_tunneling: null,
      firewall: null,
      auto_proxy: null,
      networking_mode: null,
      gui_applications: null,
      default_vhd_size: null,
      dns_proxy: null,
      safe_mode: null,
      auto_memory_reclaim: null,
      sparse_vhd: null,
    };

    const { result } = renderHook(() => useUpdateWslConfig(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(config as never);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriInvoke).toHaveBeenCalledWith("update_wsl_config", { config });
  });

  it("sets error state when tauriInvoke rejects", async () => {
    vi.mocked(tauriInvoke).mockRejectedValue(new Error("Save failed"));

    const { result } = renderHook(() => useUpdateWslConfig(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({} as never);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Save failed");
  });
});

describe("useCompactVhdx", () => {
  it("returns a mutation object", () => {
    const { result } = renderHook(() => useCompactVhdx(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();
    expect(result.current.mutate).toBeTypeOf("function");
    expect(result.current.isPending).toBe(false);
  });

  it("calls tauriInvoke with compact_vhdx and the distro name", async () => {
    vi.mocked(tauriInvoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCompactVhdx(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("Ubuntu");
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriInvoke).toHaveBeenCalledWith("compact_vhdx", { distroName: "Ubuntu" });
  });

  it("sets error state when compact_vhdx fails", async () => {
    vi.mocked(tauriInvoke).mockRejectedValue(new Error("Optimization failed"));

    const { result } = renderHook(() => useCompactVhdx(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("Ubuntu");
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Optimization failed");
  });
});
