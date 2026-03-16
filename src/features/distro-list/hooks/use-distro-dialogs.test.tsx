import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createWrapper, renderWithProviders } from "@/test/test-utils";
import { useDistroDialogs } from "./use-distro-dialogs";

const mockMutate = vi.fn();
vi.mock("@/features/distro-list/api/mutations", () => ({
  useShutdownAll: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/features/distro-list/ui/delete-distro-dialog", () => ({
  DeleteDistroDialog: (props: Record<string, unknown>) => (
    <div
      data-testid="delete-dialog"
      data-open={String(props.open)}
      data-name={String(props.distroName)}
    />
  ),
}));

vi.mock("@/features/snapshot-list/ui/create-snapshot-dialog", () => ({
  CreateSnapshotDialog: (props: Record<string, unknown>) => (
    <div data-testid="create-snapshot-dialog" data-open={String(props.open)} />
  ),
}));

vi.mock("@/features/snapshot-list/ui/restore-snapshot-dialog", () => ({
  RestoreSnapshotDialog: (props: Record<string, unknown>) => (
    <div data-testid="restore-snapshot-dialog" data-open={String(props.open)} />
  ),
}));

vi.mock("@/shared/ui/confirm-dialog", () => ({
  ConfirmDialog: (props: Record<string, unknown>) => (
    <div data-testid="confirm-dialog" data-open={String(props.open)} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDistroDialogs", () => {
  it("openCreateSnapshot sets create dialog open", () => {
    const { result } = renderHook(() => useDistroDialogs(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openCreateSnapshot("Ubuntu");
    });

    const { container } = renderWithProviders(<result.current.DialogsRenderer running={1} />);
    const dialog = container.querySelector('[data-testid="create-snapshot-dialog"]');
    expect(dialog?.getAttribute("data-open")).toBe("true");
  });

  it("openRestore sets restore dialog state", () => {
    const { result } = renderHook(() => useDistroDialogs(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openRestore("snap-1", "Ubuntu");
    });

    const { container } = renderWithProviders(<result.current.DialogsRenderer running={1} />);
    const dialog = container.querySelector('[data-testid="restore-snapshot-dialog"]');
    expect(dialog?.getAttribute("data-open")).toBe("true");
  });

  it("openDelete sets delete dialog target", () => {
    const { result } = renderHook(() => useDistroDialogs(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openDelete("Ubuntu");
    });

    const { container } = renderWithProviders(<result.current.DialogsRenderer running={1} />);
    const dialog = container.querySelector('[data-testid="delete-dialog"]');
    expect(dialog?.getAttribute("data-open")).toBe("true");
    expect(dialog?.getAttribute("data-name")).toBe("Ubuntu");
  });

  it("openShutdownConfirm opens shutdown confirmation", () => {
    const { result } = renderHook(() => useDistroDialogs(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openShutdownConfirm();
    });

    const { container } = renderWithProviders(<result.current.DialogsRenderer running={2} />);
    const dialog = container.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog?.getAttribute("data-open")).toBe("true");
  });

  it("shutdownAllPending reflects mutation state", () => {
    const { result } = renderHook(() => useDistroDialogs(), {
      wrapper: createWrapper(),
    });

    expect(result.current.shutdownAllPending).toBe(false);
  });

  it("DialogsRenderer renders all four dialogs", () => {
    const { result } = renderHook(() => useDistroDialogs(), {
      wrapper: createWrapper(),
    });

    const { container } = renderWithProviders(<result.current.DialogsRenderer running={0} />);

    expect(container.querySelector('[data-testid="delete-dialog"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="create-snapshot-dialog"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="restore-snapshot-dialog"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="confirm-dialog"]')).toBeTruthy();
  });
});
