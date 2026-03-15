import { useTranslation } from "react-i18next";
import { Search, RefreshCw, LayoutGrid, List, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDistros, distroKeys } from "../../api/queries";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/shared/lib/utils";
import { Tooltip } from "@/shared/ui/tooltip";

interface DistroSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function DistroSearchBar({ searchQuery, onSearchChange }: DistroSearchBarProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isFetching } = useDistros();
  const { viewMode, setViewMode } = usePreferencesStore(
    useShallow((s) => ({ viewMode: s.viewMode, setViewMode: s.setViewMode })),
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: distroKeys.list() });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="text-overlay-0 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder={t("distros.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="focus-ring glass-input text-text placeholder:text-overlay-0 w-full rounded-lg py-2 pr-8 pl-9 text-sm"
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

      <Tooltip content={t("distros.refreshDistributions")}>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="bg-blue/15 text-blue hover:bg-blue/25 rounded-lg p-2 transition-colors disabled:opacity-40"
          aria-label={t("distros.refreshDistributions")}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </button>
      </Tooltip>

      <div className="flex gap-0.5 rounded-lg bg-white/5 p-0.5">
        <Tooltip content={t("distros.gridView")}>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "grid"
                ? "bg-blue text-crust hover:neon-glow-blue"
                : "text-subtext-0 hover:text-text",
            )}
            aria-label={t("distros.gridView")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content={t("distros.listView")}>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-blue text-crust hover:neon-glow-blue"
                : "text-subtext-0 hover:text-text",
            )}
            aria-label={t("distros.listView")}
          >
            <List className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
