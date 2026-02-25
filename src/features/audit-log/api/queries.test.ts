import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/mocks/tauri";
import { createWrapper } from "@/test/test-utils";
import { auditKeys, useAuditLog, type AuditEntry, type SearchAuditArgs } from "./queries";

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("auditKeys", () => {
  it("all returns base key", () => {
    expect(auditKeys.all).toEqual(["audit"]);
  });

  it("search returns search key with args", () => {
    const args: SearchAuditArgs = { action_filter: "start", limit: 50 };
    expect(auditKeys.search(args)).toEqual(["audit", "search", args]);
  });

  it("search returns search key with empty args", () => {
    expect(auditKeys.search({})).toEqual(["audit", "search", {}]);
  });
});

describe("useAuditLog", () => {
  it("invokes search_audit_log with default args", async () => {
    const entries: AuditEntry[] = [
      {
        id: 1,
        timestamp: "2024-01-01T00:00:00Z",
        action: "start_distro",
        target: "Ubuntu",
        details: null,
      },
    ];
    mockInvoke.mockResolvedValue(entries);

    const { result } = renderHook(() => useAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("search_audit_log", {
      args: {
        action_filter: null,
        target_filter: null,
        limit: 100,
        offset: 0,
      },
    });
    expect(result.current.data).toEqual(entries);
  });

  it("invokes search_audit_log with custom filters", async () => {
    const entries: AuditEntry[] = [
      {
        id: 2,
        timestamp: "2024-01-02T12:00:00Z",
        action: "stop_distro",
        target: "Debian",
        details: "Graceful shutdown",
      },
    ];
    mockInvoke.mockResolvedValue(entries);

    const { result } = renderHook(
      () =>
        useAuditLog({
          action_filter: "stop_distro",
          target_filter: "Debian",
          limit: 50,
          offset: 10,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("search_audit_log", {
      args: {
        action_filter: "stop_distro",
        target_filter: "Debian",
        limit: 50,
        offset: 10,
      },
    });
    expect(result.current.data).toEqual(entries);
  });

  it("returns empty array when no entries match", async () => {
    mockInvoke.mockResolvedValue([]);

    const { result } = renderHook(() => useAuditLog({ action_filter: "nonexistent" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("handles error from backend", async () => {
    mockInvoke.mockRejectedValue(new Error("Database unavailable"));

    const { result } = renderHook(() => useAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain("Database unavailable");
  });
});
