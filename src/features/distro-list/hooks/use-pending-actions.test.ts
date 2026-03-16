import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePendingActions } from "./use-pending-actions";
import type { Distro } from "@/shared/types/distro";

function makeDistro(name: string, state: Distro["state"] = "Running"): Distro {
  return {
    name,
    state,
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "",
  };
}

describe("usePendingActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no pending actions", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));
    expect(result.current.hasPending).toBe(false);
    expect(result.current.pendingActions.size).toBe(0);
  });

  it("markPending adds a pending action", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));

    act(() => {
      result.current.markPending("Ubuntu", "Starting", "Running");
    });

    expect(result.current.hasPending).toBe(true);
    expect(result.current.getPending("Ubuntu")).toBe("Starting");
  });

  it("clearPending removes a pending action", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));

    act(() => {
      result.current.markPending("Ubuntu", "Starting", "Running");
    });
    expect(result.current.hasPending).toBe(true);

    act(() => {
      result.current.clearPending("Ubuntu");
    });
    expect(result.current.hasPending).toBe(false);
    expect(result.current.getPending("Ubuntu")).toBeUndefined();
  });

  it("getPending returns undefined for non-pending distro", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));
    expect(result.current.getPending("Debian")).toBeUndefined();
  });

  it("auto-clears when distro state matches expected target", () => {
    const initialDistros = [makeDistro("Ubuntu", "Stopped")];
    const { result, rerender } = renderHook(({ distros }) => usePendingActions(distros), {
      initialProps: { distros: initialDistros },
    });

    act(() => {
      result.current.markPending("Ubuntu", "Starting", "Running");
    });
    expect(result.current.hasPending).toBe(true);

    // Simulate distro state changing to Running
    const updatedDistros = [makeDistro("Ubuntu", "Running")];
    rerender({ distros: updatedDistros });

    expect(result.current.hasPending).toBe(false);
    expect(result.current.getPending("Ubuntu")).toBeUndefined();
  });

  it("does not auto-clear when state does not match expected", () => {
    const initialDistros = [makeDistro("Ubuntu", "Stopped")];
    const { result, rerender } = renderHook(({ distros }) => usePendingActions(distros), {
      initialProps: { distros: initialDistros },
    });

    act(() => {
      result.current.markPending("Ubuntu", "Starting", "Running");
    });

    // Distro still stopped — should NOT clear
    const sameState = [makeDistro("Ubuntu", "Stopped")];
    rerender({ distros: sameState });

    expect(result.current.hasPending).toBe(true);
  });

  it("clears stuck pending actions after 30s timeout", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));

    act(() => {
      result.current.markPending("Ubuntu", "Stopping", "Stopped");
    });
    expect(result.current.hasPending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.hasPending).toBe(false);
  });

  it("does not clear before 30s timeout", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));

    act(() => {
      result.current.markPending("Ubuntu", "Stopping", "Stopped");
    });

    act(() => {
      vi.advanceTimersByTime(29_999);
    });

    expect(result.current.hasPending).toBe(true);
  });

  it("handles multiple concurrent pending actions", () => {
    const distros = [makeDistro("Ubuntu"), makeDistro("Debian")];
    const { result } = renderHook(() => usePendingActions(distros));

    act(() => {
      result.current.markPending("Ubuntu", "Stopping", "Stopped");
      result.current.markPending("Debian", "Starting", "Running");
    });

    expect(result.current.getPending("Ubuntu")).toBe("Stopping");
    expect(result.current.getPending("Debian")).toBe("Starting");
    expect(result.current.hasPending).toBe(true);

    act(() => {
      result.current.clearPending("Ubuntu");
    });

    expect(result.current.getPending("Ubuntu")).toBeUndefined();
    expect(result.current.getPending("Debian")).toBe("Starting");
    expect(result.current.hasPending).toBe(true);
  });

  it("auto-clears only the distro that matches expected state", () => {
    const initialDistros = [makeDistro("Ubuntu", "Stopped"), makeDistro("Debian", "Running")];
    const { result, rerender } = renderHook(({ distros }) => usePendingActions(distros), {
      initialProps: { distros: initialDistros },
    });

    act(() => {
      result.current.markPending("Ubuntu", "Starting", "Running");
      result.current.markPending("Debian", "Stopping", "Stopped");
    });

    // Only Ubuntu reaches expected state
    const updatedDistros = [
      makeDistro("Ubuntu", "Running"),
      makeDistro("Debian", "Running"), // still running, not yet stopped
    ];
    rerender({ distros: updatedDistros });

    expect(result.current.getPending("Ubuntu")).toBeUndefined();
    expect(result.current.getPending("Debian")).toBe("Stopping");
    expect(result.current.hasPending).toBe(true);
  });

  it("markPending overwrites existing pending action for same distro", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));

    act(() => {
      result.current.markPending("Ubuntu", "Starting", "Running");
    });
    expect(result.current.getPending("Ubuntu")).toBe("Starting");

    act(() => {
      result.current.markPending("Ubuntu", "Stopping", "Stopped");
    });
    expect(result.current.getPending("Ubuntu")).toBe("Stopping");
  });

  it("clearPending on non-existent distro is a no-op", () => {
    const distros = [makeDistro("Ubuntu")];
    const { result } = renderHook(() => usePendingActions(distros));

    act(() => {
      result.current.clearPending("NonExistent");
    });

    expect(result.current.hasPending).toBe(false);
  });
});
