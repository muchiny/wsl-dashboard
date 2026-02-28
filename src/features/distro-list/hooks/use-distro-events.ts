import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTauriEvent } from "@/shared/hooks/use-tauri-event";
import { EVENTS } from "@/shared/api/events";
import { distroKeys } from "@/shared/api/distro-queries";

export function useDistroEvents() {
  const queryClient = useQueryClient();

  const handler = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: distroKeys.all });
  }, [queryClient]);

  useTauriEvent(EVENTS.DISTRO_STATE_CHANGED, handler);
}
