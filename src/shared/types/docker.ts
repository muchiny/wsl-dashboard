export interface Container {
  id: string;
  name: string;
  image: string;
  state: "Running" | "Paused" | "Exited" | "Created" | "Restarting" | "Dead";
  status: string;
  ports: PortMapping[];
  created_at: string;
}

export interface PortMapping {
  host_port: number | null;
  container_port: number;
  protocol: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created_at: string;
}

export interface DockerStatus {
  available: boolean;
  containers: Container[];
  images: DockerImage[];
}
