import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import {
  createTerminal,
  writeTerminal,
  resizeTerminal,
  closeTerminal,
  isTerminalAlive,
  useCreateTerminalSession,
} from "./mutations";
import { useTerminalStore } from "../model/use-terminal-store";

beforeEach(() => {
  mockInvoke.mockReset();
  useTerminalStore.getState().sessions.length = 0;
});

describe("createTerminal", () => {
  it("invokes terminal_create with distro name and returns session id", async () => {
    mockInvoke.mockResolvedValue("session-abc-123");

    const sessionId = await createTerminal("Ubuntu");

    expect(mockInvoke).toHaveBeenCalledWith("terminal_create", {
      distroName: "Ubuntu",
    });
    expect(sessionId).toBe("session-abc-123");
  });

  it("propagates errors from backend", async () => {
    mockInvoke.mockRejectedValue("Distro not running");

    await expect(createTerminal("Ubuntu")).rejects.toBe("Distro not running");
  });
});

describe("writeTerminal", () => {
  it("invokes terminal_write with session id and data as array", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const data = new Uint8Array([104, 101, 108, 108, 111]); // "hello"

    await writeTerminal("session-1", data);

    expect(mockInvoke).toHaveBeenCalledWith("terminal_write", {
      sessionId: "session-1",
      data: [104, 101, 108, 108, 111],
    });
  });
});

describe("resizeTerminal", () => {
  it("invokes terminal_resize with session id, cols and rows", async () => {
    mockInvoke.mockResolvedValue(undefined);

    await resizeTerminal("session-1", 120, 40);

    expect(mockInvoke).toHaveBeenCalledWith("terminal_resize", {
      sessionId: "session-1",
      cols: 120,
      rows: 40,
    });
  });
});

describe("closeTerminal", () => {
  it("invokes terminal_close with session id", async () => {
    mockInvoke.mockResolvedValue(undefined);

    await closeTerminal("session-1");

    expect(mockInvoke).toHaveBeenCalledWith("terminal_close", {
      sessionId: "session-1",
    });
  });
});

describe("isTerminalAlive", () => {
  it("invokes terminal_is_alive and returns boolean", async () => {
    mockInvoke.mockResolvedValue(true);
    const result = await isTerminalAlive("session-1");
    expect(mockInvoke).toHaveBeenCalledWith("terminal_is_alive", {
      sessionId: "session-1",
    });
    expect(result).toBe(true);
  });

  it("returns false when session is dead", async () => {
    mockInvoke.mockResolvedValue(false);
    const result = await isTerminalAlive("session-1");
    expect(result).toBe(false);
  });
});

describe("useCreateTerminalSession", () => {
  it("adds session to store on success", async () => {
    mockInvoke.mockResolvedValue("session-xyz");

    const { result } = renderHook(() => useCreateTerminalSession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate("Ubuntu");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const sessions = useTerminalStore.getState().sessions;
    const added = sessions.find((s) => s.id === "session-xyz");
    expect(added).toBeDefined();
    expect(added!.distroName).toBe("Ubuntu");
  });
});
