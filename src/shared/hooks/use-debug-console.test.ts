import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useDebugConsoleStore,
  useDebugConsoleSetup,
  type LogEntry,
  type LogLevel,
  type LogFilter,
} from "./use-debug-console";

// ── Mocks ──

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn().mockResolvedValue([]),
  onIpcTiming: vi.fn(),
}));

// ── Helpers ──

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 1,
    timestamp: "12:00:00.000",
    level: "INFO",
    message: "test message",
    target: "test",
    ...overrides,
  };
}

describe("useDebugConsoleStore", () => {
  beforeEach(() => {
    useDebugConsoleStore.setState({ isOpen: false, logs: [], filter: "ALL" });
  });

  // ── Initial state ──

  it("has correct initial state", () => {
    const state = useDebugConsoleStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.logs).toEqual([]);
    expect(state.filter).toBe("ALL");
  });

  // ── toggle ──

  it("toggles isOpen from false to true", () => {
    useDebugConsoleStore.getState().toggle();
    expect(useDebugConsoleStore.getState().isOpen).toBe(true);
  });

  it("toggles isOpen back to false", () => {
    useDebugConsoleStore.getState().toggle();
    useDebugConsoleStore.getState().toggle();
    expect(useDebugConsoleStore.getState().isOpen).toBe(false);
  });

  // ── addLog ──

  it("adds a log entry to the array", () => {
    const entry = makeEntry({ id: 42, message: "hello" });
    useDebugConsoleStore.getState().addLog(entry);

    const logs = useDebugConsoleStore.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual(entry);
  });

  it("appends multiple log entries in order", () => {
    const first = makeEntry({ id: 1, message: "first" });
    const second = makeEntry({ id: 2, message: "second" });

    useDebugConsoleStore.getState().addLog(first);
    useDebugConsoleStore.getState().addLog(second);

    const logs = useDebugConsoleStore.getState().logs;
    expect(logs).toHaveLength(2);
    expect(logs[0]!.message).toBe("first");
    expect(logs[1]!.message).toBe("second");
  });

  it("respects MAX_LOGS=1000 limit by dropping oldest entry", () => {
    // Pre-fill with 1000 entries
    const existingLogs = Array.from({ length: 1000 }, (_, i) =>
      makeEntry({ id: i, message: `msg-${i}` }),
    );
    useDebugConsoleStore.setState({ logs: existingLogs });

    // Adding one more should evict the oldest (id: 0)
    const overflow = makeEntry({ id: 9999, message: "overflow" });
    useDebugConsoleStore.getState().addLog(overflow);

    const logs = useDebugConsoleStore.getState().logs;
    expect(logs).toHaveLength(1000);
    expect(logs[0]!.id).toBe(1); // id: 0 was evicted
    expect(logs[logs.length - 1]!.id).toBe(9999); // new entry at the end
  });

  it("keeps exactly MAX_LOGS entries when repeatedly adding beyond limit", () => {
    const existingLogs = Array.from({ length: 1000 }, (_, i) => makeEntry({ id: i }));
    useDebugConsoleStore.setState({ logs: existingLogs });

    // Add 5 more entries
    for (let i = 0; i < 5; i++) {
      useDebugConsoleStore.getState().addLog(makeEntry({ id: 1000 + i }));
    }

    const logs = useDebugConsoleStore.getState().logs;
    expect(logs).toHaveLength(1000);
    expect(logs[0]!.id).toBe(5); // first 5 entries (0-4) were evicted
    expect(logs[logs.length - 1]!.id).toBe(1004);
  });

  // ── setLogs ──

  it("replaces the entire logs array", () => {
    useDebugConsoleStore.getState().addLog(makeEntry({ id: 1 }));
    useDebugConsoleStore.getState().addLog(makeEntry({ id: 2 }));

    const replacement = [makeEntry({ id: 100, message: "replaced" })];
    useDebugConsoleStore.getState().setLogs(replacement);

    const logs = useDebugConsoleStore.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]!.id).toBe(100);
    expect(logs[0]!.message).toBe("replaced");
  });

  it("setLogs with empty array clears logs", () => {
    useDebugConsoleStore.getState().addLog(makeEntry());
    useDebugConsoleStore.getState().setLogs([]);

    expect(useDebugConsoleStore.getState().logs).toEqual([]);
  });

  // ── clear ──

  it("clears all logs", () => {
    useDebugConsoleStore.getState().addLog(makeEntry({ id: 1 }));
    useDebugConsoleStore.getState().addLog(makeEntry({ id: 2 }));
    useDebugConsoleStore.getState().addLog(makeEntry({ id: 3 }));

    useDebugConsoleStore.getState().clear();

    expect(useDebugConsoleStore.getState().logs).toEqual([]);
  });

  it("clear works when logs are already empty", () => {
    useDebugConsoleStore.getState().clear();
    expect(useDebugConsoleStore.getState().logs).toEqual([]);
  });

  // ── setFilter ──

  it("sets filter to a specific log level", () => {
    useDebugConsoleStore.getState().setFilter("ERROR");
    expect(useDebugConsoleStore.getState().filter).toBe("ERROR");
  });

  it("sets filter back to ALL", () => {
    useDebugConsoleStore.getState().setFilter("WARN");
    useDebugConsoleStore.getState().setFilter("ALL");
    expect(useDebugConsoleStore.getState().filter).toBe("ALL");
  });

  it("accepts all valid LogFilter values", () => {
    const filters: LogFilter[] = ["ALL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
    for (const f of filters) {
      useDebugConsoleStore.getState().setFilter(f);
      expect(useDebugConsoleStore.getState().filter).toBe(f);
    }
  });

  // ── State isolation ──

  it("toggle does not affect logs or filter", () => {
    const entry = makeEntry();
    useDebugConsoleStore.getState().addLog(entry);
    useDebugConsoleStore.getState().setFilter("DEBUG");

    useDebugConsoleStore.getState().toggle();

    expect(useDebugConsoleStore.getState().logs).toHaveLength(1);
    expect(useDebugConsoleStore.getState().filter).toBe("DEBUG");
  });

  it("clear does not affect isOpen or filter", () => {
    useDebugConsoleStore.setState({ isOpen: true, filter: "WARN" });
    useDebugConsoleStore.getState().addLog(makeEntry());

    useDebugConsoleStore.getState().clear();

    expect(useDebugConsoleStore.getState().isOpen).toBe(true);
    expect(useDebugConsoleStore.getState().filter).toBe("WARN");
    expect(useDebugConsoleStore.getState().logs).toEqual([]);
  });
});

// ── Type-level tests ──

describe("LogLevel type", () => {
  it("covers all expected log levels", () => {
    const levels: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
    expect(levels).toHaveLength(5);
    // Each value is a valid LogLevel (compile-time check + runtime assertion)
    for (const level of levels) {
      expect(typeof level).toBe("string");
    }
  });
});

describe("LogFilter type", () => {
  it("includes ALL plus all LogLevel values", () => {
    const filters: LogFilter[] = ["ALL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
    expect(filters).toHaveLength(6);
    expect(filters).toContain("ALL");
  });
});

// ── useDebugConsoleSetup hook tests ──

describe("useDebugConsoleSetup", () => {
  let origError: typeof console.error;
  let origWarn: typeof console.warn;

  beforeEach(() => {
    // Save the real console methods before the hook replaces them
    origError = console.error;
    origWarn = console.warn;

    useDebugConsoleStore.setState({ isOpen: false, logs: [], filter: "ALL" });
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore console methods in case the hook cleanup didn't run
    console.error = origError;
    console.warn = origWarn;
  });

  it("fetches existing logs on mount via tauriInvoke", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");

    renderHook(() => useDebugConsoleSetup());

    expect(tauriInvoke).toHaveBeenCalledWith("get_debug_logs");
  });

  it("listens for debug-log-entry events", async () => {
    const { listen } = await import("@tauri-apps/api/event");

    renderHook(() => useDebugConsoleSetup());

    expect(listen).toHaveBeenCalledWith("debug-log-entry", expect.any(Function));
  });

  it("populates store with fetched logs", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");
    const mockLogs: LogEntry[] = [
      makeEntry({ id: 1, message: "backend log 1" }),
      makeEntry({ id: 2, message: "backend log 2" }),
    ];
    vi.mocked(tauriInvoke).mockResolvedValueOnce(mockLogs);

    renderHook(() => useDebugConsoleSetup());

    // Wait for the async tauriInvoke promise to resolve
    await vi.waitFor(() => {
      expect(useDebugConsoleStore.getState().logs).toEqual(mockLogs);
    });
  });

  it("console.error intercept adds an ERROR log entry to the store", () => {
    renderHook(() => useDebugConsoleSetup());

    // Silence the original console.error output during test
    const currentError = console.error;
    // The intercepted console.error calls origError internally,
    // which is the pre-hook console.error. We can't silence that easily,
    // but we can verify the store gets the entry.

    currentError("test error message");

    const logs = useDebugConsoleStore.getState().logs;
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const errorLog = logs.find((l) => l.message.includes("test error message"));
    expect(errorLog).toBeDefined();
    expect(errorLog!.level).toBe("ERROR");
    expect(errorLog!.target).toBe("frontend");
  });

  it("console.warn intercept adds a WARN log entry to the store", () => {
    renderHook(() => useDebugConsoleSetup());

    console.warn("test warning message");

    const logs = useDebugConsoleStore.getState().logs;
    const warnLog = logs.find((l) => l.message.includes("test warning message"));
    expect(warnLog).toBeDefined();
    expect(warnLog!.level).toBe("WARN");
  });

  it("console.warn filters out noisy 'should be greater than 0' warnings", () => {
    renderHook(() => useDebugConsoleSetup());

    console.warn("The width should be greater than 0");

    const logs = useDebugConsoleStore.getState().logs;
    const noisyLog = logs.find((l) => l.message.includes("should be greater than 0"));
    expect(noisyLog).toBeUndefined();
  });

  it("console.warn filters out noisy 'RedrawEventsCleared' warnings", () => {
    renderHook(() => useDebugConsoleSetup());

    console.warn("RedrawEventsCleared something");

    const logs = useDebugConsoleStore.getState().logs;
    const noisyLog = logs.find((l) => l.message.includes("RedrawEventsCleared"));
    expect(noisyLog).toBeUndefined();
  });

  it("Ctrl+Shift+D keyboard shortcut toggles the console", () => {
    renderHook(() => useDebugConsoleSetup());

    expect(useDebugConsoleStore.getState().isOpen).toBe(false);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "D",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(useDebugConsoleStore.getState().isOpen).toBe(true);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "D",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(useDebugConsoleStore.getState().isOpen).toBe(false);
  });

  it("does not toggle console for other keyboard shortcuts", () => {
    renderHook(() => useDebugConsoleSetup());

    // Ctrl+D without Shift
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "D",
        ctrlKey: true,
        shiftKey: false,
        bubbles: true,
      }),
    );
    expect(useDebugConsoleStore.getState().isOpen).toBe(false);

    // Shift+D without Ctrl
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "D",
        ctrlKey: false,
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(useDebugConsoleStore.getState().isOpen).toBe(false);
  });

  it("cleanup restores console.error and console.warn", () => {
    const preHookError = console.error;
    const preHookWarn = console.warn;

    const { unmount } = renderHook(() => useDebugConsoleSetup());

    // After hook mounts, console methods should be replaced
    expect(console.error).not.toBe(preHookError);
    expect(console.warn).not.toBe(preHookWarn);

    unmount();

    // After unmount, console methods should be restored to what they were before the hook
    expect(console.error).toBe(preHookError);
    expect(console.warn).toBe(preHookWarn);
  });

  it("console.error intercept handles objects via safeStringify", () => {
    renderHook(() => useDebugConsoleSetup());

    console.error("error with object:", { key: "value" });

    const logs = useDebugConsoleStore.getState().logs;
    const errorLog = logs.find((l) => l.level === "ERROR");
    expect(errorLog).toBeDefined();
    expect(errorLog!.message).toContain("error with object:");
    expect(errorLog!.message).toContain('"key":"value"');
  });

  it("console.error intercept handles non-serializable values", () => {
    renderHook(() => useDebugConsoleSetup());

    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    console.error("circular:", circular);

    const logs = useDebugConsoleStore.getState().logs;
    const errorLog = logs.find((l) => l.level === "ERROR");
    expect(errorLog).toBeDefined();
    // safeStringify falls back to String() for circular references
    expect(errorLog!.message).toContain("circular:");
  });

  it("catches unhandled promise rejections and logs them", () => {
    renderHook(() => useDebugConsoleSetup());

    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new Error("async failure"),
    });
    window.dispatchEvent(event);

    const logs = useDebugConsoleStore.getState().logs;
    const rejectionLog = logs.find((l) => l.message.includes("Unhandled: async failure"));
    expect(rejectionLog).toBeDefined();
    expect(rejectionLog!.level).toBe("ERROR");
  });

  it("catches unhandled promise rejections with non-Error reason", () => {
    renderHook(() => useDebugConsoleSetup());

    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: "string rejection" });
    window.dispatchEvent(event);

    const logs = useDebugConsoleStore.getState().logs;
    const rejectionLog = logs.find((l) => l.message.includes("Unhandled: string rejection"));
    expect(rejectionLog).toBeDefined();
    expect(rejectionLog!.level).toBe("ERROR");
  });

  it("catches global error events and logs them", () => {
    renderHook(() => useDebugConsoleSetup());

    const event = new ErrorEvent("error", {
      message: "Uncaught TypeError",
      filename: "app.js",
      lineno: 42,
    });
    window.dispatchEvent(event);

    const logs = useDebugConsoleStore.getState().logs;
    const errorLog = logs.find((l) => l.message.includes("Uncaught TypeError"));
    expect(errorLog).toBeDefined();
    expect(errorLog!.level).toBe("ERROR");
    expect(errorLog!.message).toContain("app.js:42");
  });
});
