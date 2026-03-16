import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useDistroFilter } from "./use-distro-filter";
import type { Distro } from "@/shared/types/distro";

vi.mock("@/shared/hooks/use-debounce", () => ({
  useDebounce: <T>(value: T) => value,
}));

let mockSortKey = "name-asc";
vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector: (s: { sortKey: string }) => unknown) =>
    selector({ sortKey: mockSortKey }),
}));

function makeDistro(overrides: Partial<Distro> = {}): Distro {
  return {
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const distros: Distro[] = [
  makeDistro({
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: true,
    vhdx_size_bytes: 5000,
  }),
  makeDistro({ name: "Debian", state: "Stopped", wsl_version: 2, vhdx_size_bytes: 3000 }),
  makeDistro({ name: "Alpine", state: "Running", wsl_version: 1, vhdx_size_bytes: 1000 }),
  makeDistro({ name: "Fedora", state: "Stopped", wsl_version: 1, vhdx_size_bytes: 8000 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockSortKey = "name-asc";
});

describe("useDistroFilter", () => {
  it("returns all distros when no filters applied", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    expect(result.current.processedDistros).toHaveLength(4);
  });

  it("returns empty array when distros is undefined", () => {
    const { result } = renderHook(() => useDistroFilter(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.processedDistros).toHaveLength(0);
  });

  it("filters by search query case-insensitively", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchQuery("ubuntu");
    });

    expect(result.current.processedDistros).toHaveLength(1);
    expect(result.current.processedDistros[0]!.name).toBe("Ubuntu");
  });

  it("filters by status running", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setStatusFilter("running");
    });

    expect(result.current.processedDistros).toHaveLength(2);
    expect(result.current.processedDistros.every((d) => d.state === "Running")).toBe(true);
  });

  it("filters by status stopped", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setStatusFilter("stopped");
    });

    expect(result.current.processedDistros).toHaveLength(2);
    expect(result.current.processedDistros.every((d) => d.state === "Stopped")).toBe(true);
  });

  it("filters by WSL version 1", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setWslVersionFilter(1);
    });

    expect(result.current.processedDistros).toHaveLength(2);
    expect(result.current.processedDistros.every((d) => d.wsl_version === 1)).toBe(true);
  });

  it("filters by WSL version 2", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setWslVersionFilter(2);
    });

    expect(result.current.processedDistros).toHaveLength(2);
    expect(result.current.processedDistros.every((d) => d.wsl_version === 2)).toBe(true);
  });

  it("combines search and status filters", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchQuery("e");
      result.current.setStatusFilter("stopped");
    });

    // "e" matches Debian, Alpine, Fedora; stopped matches Debian, Fedora => Debian + Fedora
    expect(result.current.processedDistros).toHaveLength(2);
    const names = result.current.processedDistros.map((d) => d.name);
    expect(names).toContain("Debian");
    expect(names).toContain("Fedora");
  });

  it("sorts by name-asc (alphabetical)", () => {
    mockSortKey = "name-asc";
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    const names = result.current.processedDistros.map((d) => d.name);
    expect(names).toEqual(["Alpine", "Debian", "Fedora", "Ubuntu"]);
  });

  it("sorts by name-desc (reverse alphabetical)", () => {
    mockSortKey = "name-desc";
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    const names = result.current.processedDistros.map((d) => d.name);
    expect(names).toEqual(["Ubuntu", "Fedora", "Debian", "Alpine"]);
  });

  it("sorts by status-running (running first)", () => {
    mockSortKey = "status-running";
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    const states = result.current.processedDistros.map((d) => d.state);
    expect(states[0]).toBe("Running");
    expect(states[1]).toBe("Running");
    expect(states[2]).toBe("Stopped");
    expect(states[3]).toBe("Stopped");
  });

  it("sorts by default-first", () => {
    mockSortKey = "default-first";
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    expect(result.current.processedDistros[0]!.is_default).toBe(true);
  });

  it("sorts by vhdx-size (largest first)", () => {
    mockSortKey = "vhdx-size";
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    const sizes = result.current.processedDistros.map((d) => d.vhdx_size_bytes);
    expect(sizes).toEqual([8000, 5000, 3000, 1000]);
  });

  it("reports isFiltered true when search is active", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFiltered).toBe(false);

    act(() => {
      result.current.setSearchQuery("test");
    });

    expect(result.current.isFiltered).toBe(true);
  });

  it("reports isFiltered true when status filter is active", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setStatusFilter("running");
    });

    expect(result.current.isFiltered).toBe(true);
  });

  it("computes correct running/stopped/total counts", () => {
    const { result } = renderHook(() => useDistroFilter(distros), {
      wrapper: createWrapper(),
    });

    expect(result.current.running).toBe(2);
    expect(result.current.stopped).toBe(2);
    expect(result.current.total).toBe(4);
  });

  it("reports zero counts when distros is undefined", () => {
    const { result } = renderHook(() => useDistroFilter(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.running).toBe(0);
    expect(result.current.stopped).toBe(0);
    expect(result.current.total).toBe(0);
  });
});
