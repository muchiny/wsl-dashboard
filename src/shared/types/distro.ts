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
