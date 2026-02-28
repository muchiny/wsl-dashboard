import { tauriInvoke } from "@/shared/api/tauri-client";
import { useTauriMutation } from "@/shared/api/use-tauri-mutation";
import { configKeys, type WslGlobalConfig } from "./queries";
import { distroKeys } from "@/shared/api/distro-queries";

export function useUpdateWslConfig() {
  return useTauriMutation<void, WslGlobalConfig>({
    mutationFn: (config) => tauriInvoke("update_wsl_config", { config }),
    invalidateKeys: [configKeys.all],
    successMessage: "Configuration saved. Restart WSL for changes to take effect.",
    errorMessage: (err) => `Failed to save config: ${err.message}`,
  });
}

export function useCompactVhdx() {
  return useTauriMutation<void, string>({
    mutationFn: (distroName) => tauriInvoke("compact_vhdx", { distroName }),
    invalidateKeys: [distroKeys.all],
    successMessage: (_data, distroName) => `Sparse mode enabled on ${distroName}`,
    errorMessage: (err) => `Optimization failed: ${err.message}`,
  });
}
