import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import type { DockerStatus } from "@/shared/types/docker";

export const dockerKeys = {
  all: ["docker"] as const,
  status: (distro: string) => [...dockerKeys.all, "status", distro] as const,
};

export function useDockerStatus(distroName: string | null) {
  return useQuery({
    queryKey: dockerKeys.status(distroName ?? ""),
    queryFn: () =>
      tauriInvoke<DockerStatus>("get_docker_status", {
        distroName: distroName!,
      }),
    enabled: !!distroName,
    refetchInterval: 5000,
  });
}
