import { useState } from "react";
import { ScrollText, Search, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuditLog, auditKeys } from "../api/queries";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { formatRelativeTime } from "@/shared/lib/formatters";

export function AuditLogViewer() {
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  const debouncedAction = useDebounce(actionFilter, 300);
  const debouncedTarget = useDebounce(targetFilter, 300);

  const { data: entries, isLoading } = useAuditLog({
    action_filter: debouncedAction || undefined,
    target_filter: debouncedTarget || undefined,
  });

  return (
    <div className="border-surface-1 bg-mantle rounded-xl border">
      <div className="border-surface-0 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="text-lavender h-5 w-5" />
          <h4 className="text-text font-semibold">Audit Log</h4>
          {entries && <span className="text-subtext-0 text-xs">({entries.length} entries)</span>}
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: auditKeys.all })}
            className="text-subtext-0 hover:bg-surface-0 hover:text-text focus-ring rounded-lg p-1.5 transition-colors"
            aria-label="Refresh audit log"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search
              className="text-overlay-0 absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action..."
              aria-label="Filter by action"
              className="focus-ring border-surface-1 bg-base text-text w-full rounded-lg border py-1 pr-2 pl-7 text-xs sm:w-36"
            />
          </div>
          <div className="relative flex-1 sm:flex-none">
            <Search
              className="text-overlay-0 absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              placeholder="Filter target..."
              aria-label="Filter by target"
              className="focus-ring border-surface-1 bg-base text-text w-full rounded-lg border py-1 pr-2 pl-7 text-xs sm:w-36"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-0 h-8 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="flex flex-col items-center px-8 py-10 text-center">
          <ScrollText className="text-surface-2 mb-2 h-8 w-8" />
          <p className="text-subtext-0 text-sm">No audit entries found.</p>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-mantle sticky top-0">
              <tr className="border-surface-0 text-subtext-0 border-b text-left">
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-surface-0/50 hover:bg-surface-0/50 border-b">
                  <td className="text-overlay-1 px-4 py-1.5 whitespace-nowrap">
                    {formatRelativeTime(entry.timestamp)}
                  </td>
                  <td className="px-4 py-1.5">
                    <span className="bg-blue/20 text-blue rounded-md px-1.5 py-0.5 font-mono">
                      {entry.action}
                    </span>
                  </td>
                  <td className="text-text px-4 py-1.5 font-mono">{entry.target}</td>
                  <td className="text-subtext-0 max-w-xs truncate px-4 py-1.5">
                    {entry.details ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
