import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { useTauriMutation } from "@/shared/api/use-tauri-mutation";
import { toast } from "@/shared/ui/toast-store";
import { distroKeys } from "@/shared/api/distro-queries";

export function useStartDistro() {
  return useTauriMutation<void, string>({
    mutationFn: (name) => tauriInvoke("start_distro", { name }),
    invalidateKeys: [distroKeys.all],
    successMessage: (_data, name) => i18next.t("distros.toastStarted", { name }),
    errorMessage: (err, name) =>
      i18next.t("distros.toastStartFailed", { name, message: err.message }),
  });
}

export function useStopDistro() {
  return useTauriMutation<void, string>({
    mutationFn: (name) => tauriInvoke("stop_distro", { name }),
    invalidateKeys: [distroKeys.all],
    successMessage: (_data, name) => i18next.t("distros.toastStopped", { name }),
    errorMessage: (err, name) =>
      i18next.t("distros.toastStopFailed", { name, message: err.message }),
  });
}

export function useRestartDistro() {
  return useTauriMutation<void, string>({
    mutationFn: (name) => tauriInvoke("restart_distro", { name }),
    invalidateKeys: [distroKeys.all],
    successMessage: (_data, name) => i18next.t("distros.toastRestarted", { name }),
    errorMessage: (err, name) =>
      i18next.t("distros.toastRestartFailed", { name, message: err.message }),
  });
}

export function useSetDefaultDistro() {
  return useTauriMutation<void, string>({
    mutationFn: (name) => tauriInvoke("set_default_distro", { name }),
    invalidateKeys: [distroKeys.all],
    successMessage: (_data, name) => i18next.t("distros.toastSetDefault", { name }),
    errorMessage: (err, name) =>
      i18next.t("distros.toastSetDefaultFailed", { name, message: err.message }),
  });
}

export function useResizeVhd() {
  return useTauriMutation<void, { name: string; size: string }>({
    mutationFn: ({ name, size }) => tauriInvoke("resize_vhd", { name, size }),
    invalidateKeys: [distroKeys.all],
    successMessage: (_data, { name, size }) => i18next.t("distros.toastResized", { name, size }),
    errorMessage: (err, { name }) =>
      i18next.t("distros.toastResizeFailed", { name, message: err.message }),
  });
}

export function useShutdownAll() {
  return useTauriMutation({
    mutationFn: () => tauriInvoke("shutdown_all"),
    invalidateKeys: [distroKeys.all],
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
        toast.success(i18next.t("distros.toastStartAllSuccess", { count: succeeded }));
      }
      if (failed > 0) {
        toast.error(i18next.t("distros.toastStartAllFailed", { count: failed }));
      }
    },
    onError: (err) => {
      toast.error(i18next.t("distros.toastStartAllError", { message: err.message }));
    },
  });
}
