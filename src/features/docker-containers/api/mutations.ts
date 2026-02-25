import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { dockerKeys } from "./queries";

interface ContainerAction {
  distroName: string;
  containerId: string;
}

export function useStartContainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ distroName, containerId }: ContainerAction) =>
      tauriInvoke("docker_start_container", { distroName, containerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dockerKeys.all });
    },
  });
}

export function useStopContainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ distroName, containerId }: ContainerAction) =>
      tauriInvoke("docker_stop_container", { distroName, containerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dockerKeys.all });
    },
  });
}
