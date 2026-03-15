import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { usePreferencesStore, type SortKey } from "@/shared/stores/use-preferences-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/shared/lib/utils";
import type { StatusFilter, WslVersionFilter } from "../../hooks/use-distro-filter";

interface DistroFilterBarProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  wslVersionFilter: WslVersionFilter;
  onWslVersionFilterChange: (value: WslVersionFilter) => void;
}

const statusOptions: { value: StatusFilter; key: string }[] = [
  { value: "all", key: "distros.filterAll" },
  { value: "running", key: "distros.filterRunning" },
  { value: "stopped", key: "distros.filterStopped" },
];

const wslVersionOptions: { value: WslVersionFilter; key: string }[] = [
  { value: "all", key: "distros.wslVersionAll" },
  { value: 1, key: "distros.wslVersion1" },
  { value: 2, key: "distros.wslVersion2" },
];

const sortOptions: { value: SortKey; key: string }[] = [
  { value: "name-asc", key: "distros.sortNameAsc" },
  { value: "name-desc", key: "distros.sortNameDesc" },
  { value: "status-running", key: "distros.sortRunningFirst" },
  { value: "status-stopped", key: "distros.sortStoppedFirst" },
  { value: "default-first", key: "distros.sortDefaultFirst" },
  { value: "vhdx-size", key: "distros.sortDiskSize" },
];

const pill = "rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer select-none";

const statusPillActive: Record<StatusFilter, string> = {
  all: "bg-blue text-crust shadow-elevation-1",
  running: "bg-green/20 text-green shadow-elevation-1",
  stopped: "bg-surface-2 text-text shadow-elevation-1",
};
const pillInactive = "text-subtext-0 hover:bg-white/8 hover:text-text";
const wslPillActive = "bg-blue text-crust shadow-elevation-1";

export function DistroFilterBar({
  statusFilter,
  onStatusFilterChange,
  wslVersionFilter,
  onWslVersionFilterChange,
}: DistroFilterBarProps) {
  const { t } = useTranslation();
  const { sortKey, setSortKey } = usePreferencesStore(
    useShallow((s) => ({ sortKey: s.sortKey, setSortKey: s.setSortKey })),
  );
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

  return (
    <div className="glass-inset flex flex-wrap items-center gap-3 rounded-lg p-2">
      {/* Status pills */}
      <div className="flex gap-0.5 rounded-full bg-white/5 p-0.5">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusFilterChange(opt.value)}
            className={cn(
              pill,
              statusFilter === opt.value ? statusPillActive[opt.value] : pillInactive,
            )}
            data-testid={`filter-status-${opt.value}`}
          >
            {t(opt.key)}
          </button>
        ))}
      </div>

      {/* WSL version pills */}
      <div className="flex gap-0.5 rounded-full bg-white/5 p-0.5">
        {wslVersionOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onWslVersionFilterChange(opt.value)}
            className={cn(pill, wslVersionFilter === opt.value ? wslPillActive : pillInactive)}
            data-testid={`filter-wsl-${opt.value}`}
          >
            {t(opt.key)}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setSortOpen((v) => !v)}
          className="text-subtext-1 hover:text-text flex max-w-[180px] items-center gap-1.5 rounded-full bg-white/5 py-1 pr-2.5 pl-2.5 text-xs font-medium transition-colors"
          data-testid="sort-dropdown"
        >
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t(sortOptions.find((o) => o.value === sortKey)?.key ?? "")}
          </span>
          <ChevronDown
            className={cn("h-3 w-3 shrink-0 transition-transform", sortOpen && "rotate-180")}
          />
        </button>
        {sortOpen && (
          <div className="glass-dropdown absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-lg py-1 shadow-lg">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSortKey(opt.value);
                  setSortOpen(false);
                }}
                data-testid={`sort-option-${opt.value}`}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  sortKey === opt.value
                    ? "text-blue"
                    : "text-subtext-1 hover:text-text hover:bg-white/8",
                )}
              >
                <Check
                  className={cn(
                    "h-3 w-3 shrink-0",
                    sortKey === opt.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{t(opt.key)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
