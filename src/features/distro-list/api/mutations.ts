import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { toast } from "@/shared/ui/toast";
import { distroKeys } from "./queries";

export function useStartDistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => tauriInvoke("start_distro", { name }),
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
      toast.success(`${name} started`);
    },
    onError: (err, name) => {
      toast.error(`Failed to start ${name}: ${err.message}`);
    },
  });
}

export function useStopDistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => tauriInvoke("stop_distro", { name }),
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
      toast.success(`${name} stopped`);
    },
    onError: (err, name) => {
      toast.error(`Failed to stop ${name}: ${err.message}`);
    },
  });
}

export function useRestartDistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => tauriInvoke("restart_distro", { name }),
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
      toast.success(`${name} restarted`);
    },
    onError: (err, name) => {
      toast.error(`Failed to restart ${name}: ${err.message}`);
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
