import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { toast } from "@/shared/ui/toast";
import { configKeys, type WslGlobalConfig } from "./queries";
import { distroKeys } from "@/features/distro-list/api/queries";

export function useUpdateWslConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: WslGlobalConfig) => tauriInvoke("update_wsl_config", { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.all });
      toast.success("Configuration saved. Restart WSL for changes to take effect.");
    },
    onError: (err) => {
      toast.error(`Failed to save config: ${err.message}`);
    },
  });
}

export function useCompactVhdx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (distroName: string) => tauriInvoke("compact_vhdx", { distroName }),
    onSuccess: (_data, distroName) => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
      toast.success(`Sparse mode enabled on ${distroName}`);
    },
    onError: (err) => {
      toast.error(`Optimization failed: ${err.message}`);
    },
  });
}
