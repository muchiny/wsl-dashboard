import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useDistroEvents } from "./use-distro-events";

let capturedEventName: string | undefined;
let capturedHandler: ((payload: unknown) => void) | undefined;
vi.mock("@/shared/hooks/use-tauri-event", () => ({
  useTauriEvent: (event: string, handler: (payload: unknown) => void) => {
    capturedEventName = event;
    capturedHandler = handler;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  capturedEventName = undefined;
  capturedHandler = undefined;
});

describe("useDistroEvents", () => {
  it("listens to the distro-state-changed event", () => {
    renderHook(() => useDistroEvents(), {
      wrapper: createWrapper(),
    });

    expect(capturedEventName).toBe("distro-state-changed");
  });

  it("invokes useTauriEvent with a handler function", () => {
    renderHook(() => useDistroEvents(), {
      wrapper: createWrapper(),
    });

    expect(capturedHandler).toBeTypeOf("function");
  });

  it("handler is defined and callable", () => {
    renderHook(() => useDistroEvents(), {
      wrapper: createWrapper(),
    });

    // Verify the handler doesn't throw when called
    expect(() => capturedHandler?.({})).not.toThrow();
  });
});
