import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { configKeys, type WslGlobalConfig } from "./queries";
import { distroKeys } from "@/features/distro-list/api/queries";

export function useUpdateWslConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: WslGlobalConfig) => tauriInvoke("update_wsl_config", { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

export function useCompactVhdx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (distroName: string) => tauriInvoke("compact_vhdx", { distroName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
    },
  });
}
