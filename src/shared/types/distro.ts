export interface Distro {
  name: string;
  state: DistroState;
  wsl_version: number;
  is_default: boolean;
  base_path: string | null;
  vhdx_size_bytes: number | null;
  last_seen: string;
}

export type DistroState = "Running" | "Stopped" | "Installing" | "Converting" | "Uninstalling";

export interface DistroDetail {
  name: string;
  state: string;
  wsl_version: number;
  is_default: boolean;
  base_path: string | null;
  vhdx_size_bytes: number | null;
  distro_config: WslDistroConfig | null;
}

export interface WslDistroConfig {
  automount_enabled: boolean | null;
  automount_root: string | null;
  network_hostname: string | null;
  network_generate_hosts: boolean | null;
  network_generate_resolv_conf: boolean | null;
  interop_enabled: boolean | null;
  interop_append_windows_path: boolean | null;
  user_default: string | null;
  boot_systemd: boolean | null;
  boot_command: string | null;
}
