import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useDistroActions } from "./use-distro-actions";
import type { Distro } from "@/shared/types/distro";

vi.mock("@/features/terminal/api/mutations", () => ({
  useCreateTerminalSession: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function makeDistro(overrides: Partial<Distro> = {}): Distro {
  return {
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: true,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeCallbacks() {
  return {
    onStart: vi.fn(),
    onStop: vi.fn(),
    onRestart: vi.fn(),
    onSnapshot: vi.fn(),
    onExpand: vi.fn(),
    onDelete: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDistroActions", () => {
  it("returns action handlers object", () => {
    const distro = makeDistro();
    const callbacks = makeCallbacks();

    const { result } = renderHook(() => useDistroActions({ distro, ...callbacks }), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty("handleStart");
    expect(result.current).toHaveProperty("handleStop");
    expect(result.current).toHaveProperty("handleRestart");
    expect(result.current).toHaveProperty("handleSnapshot");
    expect(result.current).toHaveProperty("handleTerminal");
    expect(result.current).toHaveProperty("handleKeyDown");
    expect(result.current).toHaveProperty("handleMonitorClick");
  });

  it("returns derived state for a running distro", () => {
    const distro = makeDistro({ state: "Running" });
    const callbacks = makeCallbacks();

    const { result } = renderHook(() => useDistroActions({ distro, ...callbacks }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it("returns isRunning false for a stopped distro", () => {
    const distro = makeDistro({ state: "Stopped" });
    const callbacks = makeCallbacks();

    const { result } = renderHook(() => useDistroActions({ distro, ...callbacks }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isRunning).toBe(false);
  });

  it("returns isPending true when pendingAction is set", () => {
    const distro = makeDistro();
    const callbacks = makeCallbacks();

    const { result } = renderHook(
      () => useDistroActions({ distro, pendingAction: "start", ...callbacks }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(true);
  });

  it("returns ariaLabel with distro name and state", () => {
    const distro = makeDistro({ name: "Debian", state: "Stopped" });
    const callbacks = makeCallbacks();

    const { result } = renderHook(() => useDistroActions({ distro, ...callbacks }), {
      wrapper: createWrapper(),
    });

    expect(result.current.ariaLabel).toBeDefined();
    expect(typeof result.current.ariaLabel).toBe("string");
  });

  it("exposes createTerminalSession from the terminal mutation hook", () => {
    const distro = makeDistro();
    const callbacks = makeCallbacks();

    const { result } = renderHook(() => useDistroActions({ distro, ...callbacks }), {
      wrapper: createWrapper(),
    });

    expect(result.current.createTerminalSession).toBeDefined();
    expect(result.current.createTerminalSession.mutate).toEqual(expect.any(Function));
  });
});
