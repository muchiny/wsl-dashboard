import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { formatBytes } from "@/shared/lib/formatters";
import type { ProcessInfo } from "../api/queries";

interface ProcessTableProps {
  processes: ProcessInfo[];
}

type SortKey = "cpu_percent" | "mem_percent" | "pid" | "rss_bytes";

export function ProcessTable({ processes }: ProcessTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cpu_percent");
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filtered = processes.filter(
    (p) =>
      p.command.toLowerCase().includes(filter.toLowerCase()) ||
      p.user.toLowerCase().includes(filter.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    const mult = sortAsc ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * mult;
  });

  return (
    <div className="border-surface-1 bg-mantle min-w-0 overflow-hidden rounded-xl border">
      <div className="border-surface-0 flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold">Processes ({processes.length})</h4>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter processes..."
          className="focus-ring border-surface-1 bg-base text-text w-full rounded-lg border px-2 py-1 text-xs sm:w-48"
        />
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-mantle sticky top-0">
            <tr className="border-surface-0 text-subtext-0 border-b text-left">
              <th className="px-4 py-2 text-right">
                <button
                  onClick={() => handleSort("pid")}
                  className="ml-auto flex items-center justify-end gap-1"
                >
                  PID <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2 text-right">
                <button
                  onClick={() => handleSort("cpu_percent")}
                  className="ml-auto flex items-center justify-end gap-1"
                >
                  CPU% <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-right">
                <button
                  onClick={() => handleSort("mem_percent")}
                  className="ml-auto flex items-center justify-end gap-1"
                >
                  MEM% <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-right">
                <button
                  onClick={() => handleSort("rss_bytes")}
                  className="ml-auto flex items-center justify-end gap-1"
                >
                  RSS <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2">State</th>
              <th className="px-4 py-2">Command</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 100).map((p) => (
              <tr key={p.pid} className="border-surface-0/50 hover:bg-surface-0/50 border-b">
                <td className="px-4 py-1.5 text-right font-mono tabular-nums">{p.pid}</td>
                <td className="px-4 py-1.5">{p.user}</td>
                <td className="px-4 py-1.5 text-right font-mono tabular-nums">
                  {p.cpu_percent.toFixed(1)}
                </td>
                <td className="px-4 py-1.5 text-right font-mono tabular-nums">
                  {p.mem_percent.toFixed(1)}
                </td>
                <td className="px-4 py-1.5 text-right font-mono tabular-nums">
                  {formatBytes(p.rss_bytes)}
                </td>
                <td className="px-4 py-1.5">{p.state}</td>
                <td className="max-w-xs truncate px-4 py-1.5 font-mono">{p.command}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 100 && (
        <p className="text-subtext-0 border-surface-0 border-t px-4 py-2 text-center text-xs">
          Showing first 100 of {sorted.length} processes
        </p>
      )}
    </div>
  );
}
