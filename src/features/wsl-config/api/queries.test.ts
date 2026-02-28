import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { configKeys, useWslConfig, type WslGlobalConfig } from "./queries";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("configKeys", () => {
  it("all returns base key", () => {
    expect(configKeys.all).toEqual(["wsl-config"]);
  });

  it("global returns global key", () => {
    expect(configKeys.global()).toEqual(["wsl-config", "global"]);
  });
});

describe("useWslConfig", () => {
  it("invokes get_wsl_config command", async () => {
    const config: WslGlobalConfig = {
      memory: "4GB",
      processors: 4,
      swap: "2GB",
      swap_file: null,
      localhost_forwarding: true,
      kernel: null,
      kernel_command_line: null,
      nested_virtualization: false,
      vm_idle_timeout: 60000,
      dns_tunneling: true,
      firewall: true,
      auto_proxy: true,
      networking_mode: null,
      gui_applications: null,
      default_vhd_size: null,
      dns_proxy: null,
      safe_mode: null,
      auto_memory_reclaim: null,
      sparse_vhd: null,
    };
    mockInvoke.mockResolvedValue(config);

    const { result } = renderHook(() => useWslConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("get_wsl_config", undefined);
    expect(result.current.data).toEqual(config);
  });

  it("returns all nullable fields as null when unset", async () => {
    const config: WslGlobalConfig = {
      memory: null,
      processors: null,
      swap: null,
      swap_file: null,
      localhost_forwarding: null,
      kernel: null,
      kernel_command_line: null,
      nested_virtualization: null,
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
    mockInvoke.mockResolvedValue(config);

    const { result } = renderHook(() => useWslConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(config);
  });

  it("handles error from backend", async () => {
    mockInvoke.mockRejectedValue(new Error("Config file not found"));

    const { result } = renderHook(() => useWslConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain("Config file not found");
  });
});
