import { describe, it, expect, beforeEach } from "vitest";
import { useTerminalStore } from "./use-terminal-store";
import type { TerminalSession } from "./use-terminal-store";

function makeSession(id: string, distro: string = "Ubuntu"): TerminalSession {
  return { id, distroName: distro, title: distro };
}

describe("useTerminalStore", () => {
  beforeEach(() => {
    useTerminalStore.setState({
      sessions: [],
      activeSessionId: null,
      isOpen: false,
      panelHeight: 300,
    });
  });

  // ── Initial state ──

  it("has correct initial state", () => {
    const state = useTerminalStore.getState();
    expect(state.sessions).toEqual([]);
    expect(state.activeSessionId).toBeNull();
    expect(state.isOpen).toBe(false);
    expect(state.panelHeight).toBe(300);
  });

  // ── addSession ──

  it("adds a session and sets it as active", () => {
    useTerminalStore.getState().addSession(makeSession("s1"));

    const state = useTerminalStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.id).toBe("s1");
    expect(state.activeSessionId).toBe("s1");
    expect(state.isOpen).toBe(true);
  });

  it("adds multiple sessions and activates the latest", () => {
    useTerminalStore.getState().addSession(makeSession("s1"));
    useTerminalStore.getState().addSession(makeSession("s2", "Debian"));

    const state = useTerminalStore.getState();
    expect(state.sessions).toHaveLength(2);
    expect(state.activeSessionId).toBe("s2");
  });

  // ── removeSession ──

  it("removes a session by id", () => {
    useTerminalStore.getState().addSession(makeSession("s1"));
    useTerminalStore.getState().addSession(makeSession("s2"));
    useTerminalStore.getState().removeSession("s1");

    const state = useTerminalStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.id).toBe("s2");
  });

  it("falls back to last remaining session when active is removed", () => {
    useTerminalStore.getState().addSession(makeSession("s1"));
    useTerminalStore.getState().addSession(makeSession("s2"));
    useTerminalStore.getState().addSession(makeSession("s3"));
    // s3 is active
    useTerminalStore.getState().removeSession("s3");

    expect(useTerminalStore.getState().activeSessionId).toBe("s2");
  });

  it("sets activeSessionId to null when last session is removed", () => {
    useTerminalStore.getState().addSession(makeSession("s1"));
    useTerminalStore.getState().removeSession("s1");

    const state = useTerminalStore.getState();
    expect(state.sessions).toHaveLength(0);
    expect(state.activeSessionId).toBeNull();
    expect(state.isOpen).toBe(false);
  });

  it("does not change active when removing a non-active session", () => {
    useTerminalStore.getState().addSession(makeSession("s1"));
    useTerminalStore.getState().addSession(makeSession("s2"));
    // s2 is active
    useTerminalStore.getState().removeSession("s1");

    expect(useTerminalStore.getState().activeSessionId).toBe("s2");
  });

  // ── setActiveSession ──

  it("sets the active session id", () => {
    useTerminalStore.getState().addSession(makeSession("s1"));
    useTerminalStore.getState().addSession(makeSession("s2"));
    useTerminalStore.getState().setActiveSession("s1");

    expect(useTerminalStore.getState().activeSessionId).toBe("s1");
  });

  // ── togglePanel ──

  it("toggles panel open state", () => {
    useTerminalStore.getState().togglePanel();
    expect(useTerminalStore.getState().isOpen).toBe(true);

    useTerminalStore.getState().togglePanel();
    expect(useTerminalStore.getState().isOpen).toBe(false);
  });

  // ── openPanel / closePanel ──

  it("opens the panel", () => {
    useTerminalStore.getState().openPanel();
    expect(useTerminalStore.getState().isOpen).toBe(true);
  });

  it("closes the panel", () => {
    useTerminalStore.getState().openPanel();
    useTerminalStore.getState().closePanel();
    expect(useTerminalStore.getState().isOpen).toBe(false);
  });

  // ── setPanelHeight ──

  it("sets panel height within bounds", () => {
    useTerminalStore.getState().setPanelHeight(400);
    expect(useTerminalStore.getState().panelHeight).toBe(400);
  });

  it("clamps panel height to minimum of 150", () => {
    useTerminalStore.getState().setPanelHeight(50);
    expect(useTerminalStore.getState().panelHeight).toBe(150);
  });

  it("clamps panel height to maximum of 600", () => {
    useTerminalStore.getState().setPanelHeight(1000);
    expect(useTerminalStore.getState().panelHeight).toBe(600);
  });
});
