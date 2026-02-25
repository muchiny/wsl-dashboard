import { describe, it, expect, beforeEach } from "vitest";
import {
  useDebugConsoleStore,
  type LogEntry,
  type LogLevel,
  type LogFilter,
} from "./use-debug-console";

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
    const existingLogs = Array.from({ length: 1000 }, (_, i) =>
      makeEntry({ id: i }),
    );
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
