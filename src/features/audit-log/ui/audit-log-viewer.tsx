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
    <div className="border-border bg-card rounded-lg border">
      <div className="border-border flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="text-primary h-5 w-5" />
          <h4 className="font-semibold">Audit Log</h4>
          {entries && (
            <span className="text-muted-foreground text-xs">({entries.length} entries)</span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2" />
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action..."
              className="border-border bg-background focus:border-primary w-36 rounded-md border py-1 pr-2 pl-7 text-xs focus:outline-none"
            />
          </div>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2" />
            <input
              type="text"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              placeholder="Filter target..."
              className="border-border bg-background focus:border-primary w-36 rounded-md border py-1 pr-2 pl-7 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-8 animate-pulse rounded" />
          ))}
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="text-muted-foreground p-8 text-center text-sm">No audit entries found.</div>
      )}

      {entries && entries.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-card sticky top-0">
              <tr className="border-border text-muted-foreground border-b text-left">
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-border/50 hover:bg-accent/50 border-b">
                  <td className="text-muted-foreground px-4 py-1.5 whitespace-nowrap">
                    {formatRelativeTime(entry.timestamp)}
                  </td>
                  <td className="px-4 py-1.5">
                    <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 font-mono">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 font-mono">{entry.target}</td>
                  <td className="text-muted-foreground max-w-xs truncate px-4 py-1.5">
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
