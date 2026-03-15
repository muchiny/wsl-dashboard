import { useState, useMemo } from "react";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { usePreferencesStore, type SortKey } from "@/shared/stores/use-preferences-store";
import type { Distro } from "@/shared/types/distro";

export type StatusFilter = "all" | "running" | "stopped";
export type WslVersionFilter = "all" | 1 | 2;

const SORT_COMPARATORS: Record<SortKey, (a: Distro, b: Distro) => number> = {
  "name-asc": (a, b) => a.name.localeCompare(b.name),
  "name-desc": (a, b) => b.name.localeCompare(a.name),
  "status-running": (a, b) => {
    if (a.state === "Running" && b.state !== "Running") return -1;
    if (a.state !== "Running" && b.state === "Running") return 1;
    return a.name.localeCompare(b.name);
  },
  "status-stopped": (a, b) => {
    if (a.state === "Stopped" && b.state !== "Stopped") return -1;
    if (a.state !== "Stopped" && b.state === "Stopped") return 1;
    return a.name.localeCompare(b.name);
  },
  "default-first": (a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return a.name.localeCompare(b.name);
  },
  "vhdx-size": (a, b) => {
    const sizeA = a.vhdx_size_bytes ?? 0;
    const sizeB = b.vhdx_size_bytes ?? 0;
    return sizeB - sizeA;
  },
};

export function useDistroFilter(distros: Distro[] | undefined) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [wslVersionFilter, setWslVersionFilter] = useState<WslVersionFilter>("all");

  const sortKey = usePreferencesStore((s) => s.sortKey);

  const debouncedSearch = useDebounce(searchQuery, 200);

  const running = distros?.filter((d) => d.state === "Running").length ?? 0;
  const stopped = (distros?.length ?? 0) - running;
  const total = distros?.length ?? 0;

  const isFiltered = debouncedSearch !== "" || statusFilter !== "all" || wslVersionFilter !== "all";

  const processedDistros = useMemo(() => {
    let result = distros ?? [];

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(lower));
    }

    if (statusFilter === "running") {
      result = result.filter((d) => d.state === "Running");
    } else if (statusFilter === "stopped") {
      result = result.filter((d) => d.state === "Stopped");
    }

    if (wslVersionFilter !== "all") {
      result = result.filter((d) => d.wsl_version === wslVersionFilter);
    }

    return [...result].sort(SORT_COMPARATORS[sortKey]);
  }, [distros, debouncedSearch, statusFilter, wslVersionFilter, sortKey]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    wslVersionFilter,
    setWslVersionFilter,
    processedDistros,
    isFiltered,
    running,
    stopped,
    total,
  };
}
