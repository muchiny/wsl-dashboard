import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { portForwardingKeys, useListeningPorts, usePortForwardingRules } from "./queries";
import type { ListeningPort, PortForwardRule } from "./queries";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("portForwardingKeys", () => {
  it("all returns base key", () => {
    expect(portForwardingKeys.all).toEqual(["port-forwarding"]);
  });

  it("listeningPorts includes distro name", () => {
    expect(portForwardingKeys.listeningPorts("Ubuntu")).toEqual([
      "port-forwarding",
      "listening",
      "Ubuntu",
    ]);
  });

  it("rules includes distro name when provided", () => {
    expect(portForwardingKeys.rules("Ubuntu")).toEqual(["port-forwarding", "rules", "Ubuntu"]);
  });

  it("rules uses 'all' when no distro specified", () => {
    expect(portForwardingKeys.rules()).toEqual(["port-forwarding", "rules", "all"]);
  });
});

describe("useListeningPorts", () => {
  it("invokes list_listening_ports with distro name", async () => {
    const ports: ListeningPort[] = [
      { port: 3000, protocol: "tcp", process: "node", pid: 1234 },
      { port: 22, protocol: "tcp", process: "sshd", pid: 567 },
    ];
    mockInvoke.mockResolvedValue(ports);

    const { result } = renderHook(() => useListeningPorts("Ubuntu"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("list_listening_ports", {
      distroName: "Ubuntu",
    });
    expect(result.current.data).toEqual(ports);
  });

  it("does not fetch when distro name is empty", () => {
    const { result } = renderHook(() => useListeningPorts(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe("usePortForwardingRules", () => {
  it("invokes get_port_forwarding_rules with distro filter", async () => {
    const rules: PortForwardRule[] = [
      {
        id: "r1",
        distro_name: "Ubuntu",
        wsl_port: 3000,
        host_port: 3000,
        protocol: "tcp",
        enabled: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];
    mockInvoke.mockResolvedValue(rules);

    const { result } = renderHook(() => usePortForwardingRules("Ubuntu"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("get_port_forwarding_rules", {
      distroName: "Ubuntu",
    });
    expect(result.current.data).toEqual(rules);
  });

  it("invokes with null distroName when no filter provided", async () => {
    mockInvoke.mockResolvedValue([]);

    const { result } = renderHook(() => usePortForwardingRules(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("get_port_forwarding_rules", {
      distroName: null,
    });
  });
});
