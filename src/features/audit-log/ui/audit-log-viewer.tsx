import { useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { useAuditLog } from "../api/queries";
import { formatRelativeTime } from "@/shared/lib/formatters";

export function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  const { data: entries, isLoading } = useAuditLog({
    action_filter: actionFilter || undefined,
    target_filter: targetFilter || undefined,
  });

  return (
    <div className="rounded-xl border border-surface-1 bg-mantle">
      <div className="flex flex-col gap-3 border-b border-surface-0 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-lavender" />
          <h4 className="font-semibold text-text">Audit Log</h4>
          {entries && <span className="text-xs text-subtext-0">({entries.length} entries)</span>}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-overlay-0" />
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action..."
              className="w-full rounded-lg border border-surface-1 bg-base py-1 pl-7 pr-2 text-xs text-text focus:border-blue focus:outline-none sm:w-36"
            />
          </div>
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-overlay-0" />
            <input
              type="text"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              placeholder="Filter target..."
              className="w-full rounded-lg border border-surface-1 bg-base py-1 pl-7 pr-2 text-xs text-text focus:border-blue focus:outline-none sm:w-36"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-surface-0" />
          ))}
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="p-8 text-center text-sm text-subtext-0">No audit entries found.</div>
      )}

      {entries && entries.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-mantle">
              <tr className="border-b border-surface-0 text-left text-subtext-0">
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-surface-0/50 hover:bg-surface-0/50"
                >
                  <td className="whitespace-nowrap px-4 py-1.5 text-overlay-1">
                    {formatRelativeTime(entry.timestamp)}
                  </td>
                  <td className="px-4 py-1.5">
                    <span className="rounded-md bg-blue/10 px-1.5 py-0.5 font-mono text-blue">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 font-mono text-text">{entry.target}</td>
                  <td className="max-w-xs truncate px-4 py-1.5 text-subtext-0">
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
