import { invoke } from "@tauri-apps/api/core";

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    throw new Error(typeof error === "string" ? error : String(error));
  }
}
