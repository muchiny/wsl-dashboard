import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "@/shared/ui/toast-store";

type TauriMutationOptions<TData, TVariables> = {
  mutationFn: UseMutationOptions<TData, Error, TVariables>["mutationFn"];
  invalidateKeys?: QueryKey[];
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: Error, variables: TVariables) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
};

/**
 * Lightweight wrapper around useMutation that handles:
 * - Query invalidation on success
 * - Toast notifications for success/error
 */
export function useTauriMutation<TData = void, TVariables = void>({
  mutationFn,
  invalidateKeys,
  successMessage,
  errorMessage,
  onSuccess,
}: TauriMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      if (successMessage) {
        const msg =
          typeof successMessage === "function" ? successMessage(data, variables) : successMessage;
        toast.success(msg);
      }
      onSuccess?.(data, variables);
    },
    onError: (err, variables) => {
      if (errorMessage) {
        const msg =
          typeof errorMessage === "function" ? errorMessage(err, variables) : errorMessage;
        toast.error(msg);
      } else {
        toast.error(err.message);
      }
    },
  });
}
