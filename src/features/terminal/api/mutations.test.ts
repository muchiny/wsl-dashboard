import { describe, it, expect, beforeEach } from "vitest";
import { mockInvoke } from "@/test/mocks/tauri";
import { createTerminal, writeTerminal, resizeTerminal, closeTerminal } from "./mutations";

beforeEach(() => {
  mockInvoke.mockReset();
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
