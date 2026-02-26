import { useState, useRef, useEffect } from "react";
import {
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Play,
  Plus,
  Power,
  ArrowUpDown,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDistros, distroKeys } from "../api/queries";
import { useStartAll } from "../api/mutations";
import {
  usePreferencesStore,
  type SortKey,
} from "@/shared/stores/use-preferences-store";
import { cn } from "@/shared/lib/utils";
import type { Distro } from "@/shared/types/distro";

interface DistrosToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "running" | "stopped";
  onStatusFilterChange: (value: "all" | "running" | "stopped") => void;
  wslVersionFilter: "all" | 1 | 2;
  onWslVersionFilterChange: (value: "all" | 1 | 2) => void;
  distros: Distro[] | undefined;
  onNewSnapshot: () => void;
  onShutdownAll: () => void;
  shutdownAllPending: boolean;
  running: number;
  stopped: number;
  total: number;
}

const statusOptions = [
  { value: "all" as const, label: "All" },
  { value: "running" as const, label: "Running" },
  { value: "stopped" as const, label: "Stopped" },
];

const wslVersionOptions = [
  { value: "all" as const, label: "All" },
  { value: 1 as const, label: "WSL 1" },
  { value: 2 as const, label: "WSL 2" },
];

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "status-running", label: "Running first" },
  { value: "status-stopped", label: "Stopped first" },
  { value: "default-first", label: "Default first" },
  { value: "vhdx-size", label: "Disk size" },
];

const pill =
  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none";
const pillActive = "bg-blue text-crust";
const pillInactive = "text-subtext-0 hover:bg-surface-0 hover:text-text";

export function DistrosToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  wslVersionFilter,
  onWslVersionFilterChange,
  distros,
  onNewSnapshot,
  onShutdownAll,
  shutdownAllPending,
  running,
  stopped,
  total,
}: DistrosToolbarProps) {
  const queryClient = useQueryClient();
  const { isFetching } = useDistros();
  const startAll = useStartAll();
  const { sortKey, setSortKey, viewMode, setViewMode } =
    usePreferencesStore();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    if (sortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [sortOpen]);

  const stoppedNames =
    distros?.filter((d) => d.state === "Stopped").map((d) => d.name) ?? [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: distroKeys.list() });
  };

  return (
    <div className="bg-mantle rounded-xl p-3 space-y-3">
      {/* Row 1: Stats + Search + Actions */}
      <div className="flex items-center gap-2">
        {/* Inline stats */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-subtext-0">{total} distros</span>
          <span className="text-overlay-0">·</span>
          <span className="text-green">{running} up</span>
          <span className="text-overlay-0">·</span>
          <span className="text-overlay-0">{stopped} off</span>
        </div>

        <div className="bg-surface-1/50 h-4 w-px" aria-hidden="true" />

        <div className="relative min-w-0 flex-1">
          <Search className="text-overlay-0 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search distributions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-base text-text placeholder:text-overlay-0 focus:ring-blue/40 w-full rounded-lg py-2 pr-8 pl-9 text-sm focus:outline-none focus:ring-2"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-overlay-0 hover:text-text absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="text-subtext-0 hover:bg-surface-0 hover:text-text rounded-lg p-2 transition-colors disabled:opacity-40"
          aria-label="Refresh distributions"
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin")}
          />
        </button>

        <div className="bg-surface-0 flex gap-0.5 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "grid"
                ? "bg-blue text-crust"
                : "text-subtext-0 hover:text-text",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-blue text-crust"
                : "text-subtext-0 hover:text-text",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Filters + Sort + Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="bg-surface-0/50 flex gap-0.5 rounded-full p-0.5">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusFilterChange(opt.value)}
              className={cn(
                pill,
                statusFilter === opt.value ? pillActive : pillInactive,
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* WSL version pills */}
        <div className="bg-surface-0/50 flex gap-0.5 rounded-full p-0.5">
          {wslVersionOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onWslVersionFilterChange(opt.value)}
              className={cn(
                pill,
                wslVersionFilter === opt.value ? pillActive : pillInactive,
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="bg-surface-0/50 text-subtext-1 hover:text-text flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2.5 text-xs font-medium transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOptions.find((o) => o.value === sortKey)?.label}
            <ChevronDown className={cn("h-3 w-3 transition-transform", sortOpen && "rotate-180")} />
          </button>
          {sortOpen && (
            <div className="bg-surface-0 border-surface-1 absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-lg border py-1 shadow-lg">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortKey(opt.value);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                    sortKey === opt.value
                      ? "text-blue"
                      : "text-subtext-1 hover:bg-surface-1 hover:text-text",
                  )}
                >
                  <Check
                    className={cn(
                      "h-3 w-3",
                      sortKey === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Bulk actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => startAll.mutate(stoppedNames)}
            disabled={startAll.isPending || stoppedNames.length === 0}
            className="bg-green/15 text-green hover:bg-green/25 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
            {startAll.isPending ? "Starting..." : "Start All"}
          </button>

          <button
            onClick={onNewSnapshot}
            className="bg-mauve/15 text-mauve hover:bg-mauve/25 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Snapshot
          </button>

          <button
            onClick={onShutdownAll}
            disabled={shutdownAllPending || running === 0}
            className="bg-red/15 text-red hover:bg-red/25 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Power className="h-3.5 w-3.5" />
            {shutdownAllPending ? "Stopping..." : "Stop All"}
          </button>
        </div>
      </div>
    </div>
  );
}
