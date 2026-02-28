import { invoke } from "@tauri-apps/api/core";

type IpcTimingCallback = (cmd: string, durationMs: number, ok: boolean) => void;

let _onIpcTiming: IpcTimingCallback | null = null;

/** Register a callback for IPC timing events (dev only). */
export function onIpcTiming(callback: IpcTimingCallback) {
  _onIpcTiming = callback;
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const start = _onIpcTiming ? performance.now() : 0;
  try {
    const result = await invoke<T>(cmd, args);
    _onIpcTiming?.(cmd, performance.now() - start, true);
    return result;
  } catch (error) {
    _onIpcTiming?.(cmd, performance.now() - start, false);
    throw new Error(typeof error === "string" ? error : String(error));
  }
}
