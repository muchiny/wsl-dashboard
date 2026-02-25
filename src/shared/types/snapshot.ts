export interface Snapshot {
  id: string;
  distro_name: string;
  name: string;
  description: string | null;
  snapshot_type: "full" | "incremental";
  format: string;
  file_path: string;
  file_size_bytes: number;
  parent_id: string | null;
  created_at: string;
  status: string;
}

export interface CreateSnapshotArgs {
  distro_name: string;
  name: string;
  description?: string;
  format?: "tar" | "tar.gz" | "tar.xz" | "vhdx";
  output_dir: string;
}

export interface RestoreSnapshotArgs {
  snapshot_id: string;
  mode: "clone" | "overwrite";
  new_name?: string;
  install_location: string;
}
