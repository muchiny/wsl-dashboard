import { tauriInvoke } from "@/shared/api/tauri-client";
import { useTauriMutation } from "@/shared/api/use-tauri-mutation";
import { portForwardingKeys } from "./queries";
import type { PortForwardRule } from "./queries";

export function useAddPortForwarding() {
  return useTauriMutation<
    PortForwardRule,
    { distroName: string; wslPort: number; hostPort: number }
  >({
    mutationFn: (params) =>
      tauriInvoke<PortForwardRule>("add_port_forwarding", {
        distroName: params.distroName,
        wslPort: params.wslPort,
        hostPort: params.hostPort,
      }),
    invalidateKeys: [portForwardingKeys.all],
    successMessage: (_data, params) =>
      `Port forwarding added: ${params.distroName}:${params.wslPort} -> localhost:${params.hostPort}`,
    errorMessage: (err) => `Failed to add port forwarding: ${err.message}`,
  });
}

export function useRemovePortForwarding() {
  return useTauriMutation<void, string>({
    mutationFn: (ruleId) => tauriInvoke("remove_port_forwarding", { ruleId }),
    invalidateKeys: [portForwardingKeys.all],
    successMessage: "Port forwarding rule removed",
    errorMessage: (err) => `Failed to remove port forwarding: ${err.message}`,
  });
}
