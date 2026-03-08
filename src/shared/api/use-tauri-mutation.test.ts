import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useTauriMutation } from "./use-tauri-mutation";
import { toast } from "@/shared/ui/toast-store";

vi.mock("@/shared/ui/toast-store", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useTauriMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the provided mutationFn when mutate is invoked", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");

    const { result } = renderHook(() => useTauriMutation({ mutationFn }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(undefined);
    });

    expect(mutationFn).toHaveBeenCalledOnce();
  });

  it("shows success toast and invalidates keys on success", async () => {
    const mutationFn = vi.fn().mockResolvedValue("result");

    const { result } = renderHook(
      () =>
        useTauriMutation({
          mutationFn,
          successMessage: "Saved!",
          invalidateKeys: [["some-key"]],
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    expect(toast.success).toHaveBeenCalledWith("Saved!");
  });

  it("shows error toast on failure", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useTauriMutation({ mutationFn, errorMessage: "Failed!" }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(undefined);
    });

    expect(toast.error).toHaveBeenCalledWith("Failed!");
  });

  it("uses error.message as toast when no errorMessage is provided", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("unexpected"));

    const { result } = renderHook(() => useTauriMutation({ mutationFn }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(undefined);
    });

    expect(toast.error).toHaveBeenCalledWith("unexpected");
  });

  it("supports function-based success message", async () => {
    const mutationFn = vi.fn().mockResolvedValue("data");

    const { result } = renderHook(
      () =>
        useTauriMutation<string, string>({
          mutationFn,
          successMessage: (data, vars) => `Done: ${data} for ${vars}`,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate("myVar");
    });

    expect(toast.success).toHaveBeenCalledWith("Done: data for myVar");
  });

  it("calls onSuccess callback when provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue("result");
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useTauriMutation({ mutationFn, onSuccess }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(undefined);
    });

    expect(onSuccess).toHaveBeenCalledWith("result", undefined);
  });
});
