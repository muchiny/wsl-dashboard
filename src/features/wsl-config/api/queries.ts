import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";

export interface WslGlobalConfig {
  memory: string | null;
  processors: number | null;
  swap: string | null;
  swap_file: string | null;
  localhost_forwarding: boolean | null;
  kernel: string | null;
  kernel_command_line: string | null;
  nested_virtualization: boolean | null;
  vm_idle_timeout: number | null;
  dns_tunneling: boolean | null;
  firewall: boolean | null;
  auto_proxy: boolean | null;
  // [wsl2] new fields
  networking_mode: string | null;
  gui_applications: boolean | null;
  default_vhd_size: string | null;
  dns_proxy: boolean | null;
  safe_mode: boolean | null;
  // [experimental] section
  auto_memory_reclaim: string | null;
  sparse_vhd: boolean | null;
}

export interface WslVersionInfo {
  wsl_version: string | null;
  kernel_version: string | null;
  wslg_version: string | null;
  windows_version: string | null;
}

export const configKeys = {
  all: ["wsl-config"] as const,
  global: () => [...configKeys.all, "global"] as const,
  version: () => [...configKeys.all, "version"] as const,
};

export function useWslConfig() {
  return useQuery({
    queryKey: configKeys.global(),
    queryFn: () => tauriInvoke<WslGlobalConfig>("get_wsl_config"),
  });
}

export function useWslVersion() {
  return useQuery({
    queryKey: configKeys.version(),
    queryFn: () => tauriInvoke<WslVersionInfo>("get_wsl_version"),
    staleTime: 60_000,
  });
}
