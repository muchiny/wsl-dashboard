import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { useAddPortForwarding, useRemovePortForwarding } from "./mutations";
import type { PortForwardRule } from "./queries";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("useAddPortForwarding", () => {
  it("invokes add_port_forwarding with correct params", async () => {
    const mockRule: PortForwardRule = {
      id: "r1",
      distro_name: "Ubuntu",
      wsl_port: 3000,
      host_port: 3000,
      protocol: "tcp",
      enabled: true,
      created_at: "2024-01-01T00:00:00Z",
    };
    mockInvoke.mockResolvedValue(mockRule);

    const { result } = renderHook(() => useAddPortForwarding(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        distroName: "Ubuntu",
        wslPort: 3000,
        hostPort: 3000,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("add_port_forwarding", {
      distroName: "Ubuntu",
      wslPort: 3000,
      hostPort: 3000,
    });
    expect(result.current.data).toEqual(mockRule);
  });

  it("handles error from backend", async () => {
    mockInvoke.mockRejectedValue(
      "netsh portproxy add failed: You may need to run as administrator.",
    );

    const { result } = renderHook(() => useAddPortForwarding(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        distroName: "Ubuntu",
        wslPort: 3000,
        hostPort: 3000,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRemovePortForwarding", () => {
  it("invokes remove_port_forwarding with rule ID", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemovePortForwarding(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate("r1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("remove_port_forwarding", {
      ruleId: "r1",
    });
  });

  it("handles error when rule not found", async () => {
    mockInvoke.mockRejectedValue("Port forwarding rule not found");

    const { result } = renderHook(() => useRemovePortForwarding(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate("nonexistent");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
