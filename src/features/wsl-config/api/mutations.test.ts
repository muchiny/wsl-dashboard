import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useUpdateWslConfig, useCompactVhdx } from "./mutations";

vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn(),
}));

describe("useUpdateWslConfig", () => {
  it("returns a mutation object", () => {
    const { result } = renderHook(() => useUpdateWslConfig(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();
    expect(result.current.mutate).toBeTypeOf("function");
    expect(result.current.isPending).toBe(false);
  });
});

describe("useCompactVhdx", () => {
  it("returns a mutation object", () => {
    const { result } = renderHook(() => useCompactVhdx(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();
    expect(result.current.mutate).toBeTypeOf("function");
    expect(result.current.isPending).toBe(false);
  });
});
