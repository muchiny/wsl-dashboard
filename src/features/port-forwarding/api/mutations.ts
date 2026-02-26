import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { toast } from "@/shared/ui/toast-store";
import { portForwardingKeys } from "./queries";
import type { PortForwardRule } from "./queries";

export function useAddPortForwarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { distroName: string; wslPort: number; hostPort: number }) =>
      tauriInvoke<PortForwardRule>("add_port_forwarding", {
        distroName: params.distroName,
        wslPort: params.wslPort,
        hostPort: params.hostPort,
      }),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({
        queryKey: portForwardingKeys.all,
      });
      toast.success(
        `Port forwarding added: ${params.distroName}:${params.wslPort} -> localhost:${params.hostPort}`,
      );
    },
    onError: (err) => {
      toast.error(`Failed to add port forwarding: ${err.message}`);
    },
  });
}

export function useRemovePortForwarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => tauriInvoke("remove_port_forwarding", { ruleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: portForwardingKeys.all,
      });
      toast.success("Port forwarding rule removed");
    },
    onError: (err) => {
      toast.error(`Failed to remove port forwarding: ${err.message}`);
    },
  });
}
