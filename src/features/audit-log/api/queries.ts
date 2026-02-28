import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";

export interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  target: string;
  details: string | null;
}

export interface SearchAuditArgs {
  action_filter?: string;
  target_filter?: string;
  limit?: number;
  offset?: number;
}

export const auditKeys = {
  all: ["audit"] as const,
  search: (args: SearchAuditArgs) => [...auditKeys.all, "search", args] as const,
};

export function useAuditLog(args: SearchAuditArgs = {}) {
  return useQuery({
    queryKey: auditKeys.search(args),
    queryFn: () =>
      tauriInvoke<AuditEntry[]>("search_audit_log", {
        args: {
          action_filter: args.action_filter ?? null,
          target_filter: args.target_filter ?? null,
          limit: args.limit ?? 100,
          offset: args.offset ?? 0,
        },
      }),
  });
}
