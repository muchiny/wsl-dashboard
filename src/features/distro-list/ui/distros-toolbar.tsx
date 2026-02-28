import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDistros, distroKeys } from "../api/queries";
import { useStartAll } from "../api/mutations";
import { usePreferencesStore, type SortKey } from "@/shared/stores/use-preferences-store";
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
  { value: "all" as const, key: "distros.filterAll" },
  { value: "running" as const, key: "distros.filterRunning" },
  { value: "stopped" as const, key: "distros.filterStopped" },
];

const wslVersionOptions = [
  { value: "all" as const, key: "distros.wslVersionAll" },
  { value: 1 as const, key: "distros.wslVersion1" },
  { value: 2 as const, key: "distros.wslVersion2" },
];

const sortOptions: { value: SortKey; key: string }[] = [
  { value: "name-asc", key: "distros.sortNameAsc" },
  { value: "name-desc", key: "distros.sortNameDesc" },
  { value: "status-running", key: "distros.sortRunningFirst" },
  { value: "status-stopped", key: "distros.sortStoppedFirst" },
  { value: "default-first", key: "distros.sortDefaultFirst" },
  { value: "vhdx-size", key: "distros.sortDiskSize" },
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isFetching } = useDistros();
  const startAll = useStartAll();
  const { sortKey, setSortKey, viewMode, setViewMode } = usePreferencesStore();
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

  const stoppedNames = distros?.filter((d) => d.state === "Stopped").map((d) => d.name) ?? [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: distroKeys.list() });
  };

  return (
    <div className="bg-mantle space-y-3 rounded-xl p-3">
      {/* Row 1: Stats + Search + Actions */}
      <div className="flex items-center gap-2">
        {/* Inline stats */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-subtext-0">{t("distros.count", { count: total })}</span>
          <span className="text-overlay-0">·</span>
          <span className="text-green">{t("distros.running", { count: running })}</span>
          <span className="text-overlay-0">·</span>
          <span className="text-overlay-0">{t("distros.stopped", { count: stopped })}</span>
        </div>

        <div className="bg-surface-1/50 h-4 w-px" aria-hidden="true" />

        <div className="relative min-w-0 flex-1">
          <Search className="text-overlay-0 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("distros.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="focus-ring bg-base text-text placeholder:text-overlay-0 w-full rounded-lg py-2 pr-8 pl-9 text-sm"
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
          aria-label={t("distros.refreshDistributions")}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </button>

        <div className="bg-surface-0 flex gap-0.5 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "grid" ? "bg-blue text-crust" : "text-subtext-0 hover:text-text",
            )}
            aria-label={t("distros.gridView")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "list" ? "bg-blue text-crust" : "text-subtext-0 hover:text-text",
            )}
            aria-label={t("distros.listView")}
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
              className={cn(pill, statusFilter === opt.value ? pillActive : pillInactive)}
            >
              {t(opt.key)}
            </button>
          ))}
        </div>

        {/* WSL version pills */}
        <div className="bg-surface-0/50 flex gap-0.5 rounded-full p-0.5">
          {wslVersionOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onWslVersionFilterChange(opt.value)}
              className={cn(pill, wslVersionFilter === opt.value ? pillActive : pillInactive)}
            >
              {t(opt.key)}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="bg-surface-0/50 text-subtext-1 hover:text-text flex max-w-[180px] items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2.5 text-xs font-medium transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {t(sortOptions.find((o) => o.value === sortKey)?.key ?? "")}
            </span>
            <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", sortOpen && "rotate-180")} />
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
                    className={cn("h-3 w-3 shrink-0", sortKey === opt.value ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{t(opt.key)}</span>
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
            className="bg-green/20 text-green hover:bg-green/30 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          >
            {startAll.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {startAll.isPending ? t("distros.startAllPending") : t("distros.startAll")}
          </button>

          <button
            onClick={onNewSnapshot}
            className="bg-mauve/20 text-mauve hover:bg-mauve/30 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("distros.snapshot")}
          </button>

          <button
            onClick={onShutdownAll}
            disabled={shutdownAllPending || running === 0}
            className="bg-red/20 text-red hover:bg-red/30 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          >
            {shutdownAllPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            {shutdownAllPending ? t("distros.stopAllPending") : t("distros.stopAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
