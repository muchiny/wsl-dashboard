import { invoke } from "@tauri-apps/api/core";

export class TauriError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TauriError";
  }
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    throw new TauriError(typeof error === "string" ? error : String(error));
  }
}
