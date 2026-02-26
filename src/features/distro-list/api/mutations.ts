import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { toast } from "@/shared/ui/toast-store";
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

export function useStartAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (names: string[]) => {
      const results = await Promise.allSettled(
        names.map((name) => tauriInvoke("start_distro", { name })),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: distroKeys.all });
      if (succeeded > 0) {
        toast.success(`Started ${succeeded} distribution${succeeded > 1 ? "s" : ""}`);
      }
      if (failed > 0) {
        toast.error(`Failed to start ${failed} distribution${failed > 1 ? "s" : ""}`);
      }
    },
    onError: (err) => {
      toast.error(`Start all failed: ${err.message}`);
    },
  });
}
