import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export async function listenToEvent<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<UnlistenFn> {
  return listen<T>(event, (e) => handler(e.payload));
}

export const EVENTS = {
  DISTRO_STATE_CHANGED: "distro-state-changed",
  SYSTEM_METRICS: "system-metrics",
  SNAPSHOT_PROGRESS: "snapshot-progress",
} as const;
