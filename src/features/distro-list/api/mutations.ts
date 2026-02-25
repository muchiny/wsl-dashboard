import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { distroKeys } from "./queries";

export function useStartDistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => tauriInvoke("start_distro", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
    },
  });
}

export function useStopDistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => tauriInvoke("stop_distro", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
    },
  });
}

export function useRestartDistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => tauriInvoke("restart_distro", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
    },
  });
}

export function useShutdownAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tauriInvoke("shutdown_all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
    },
  });
}
