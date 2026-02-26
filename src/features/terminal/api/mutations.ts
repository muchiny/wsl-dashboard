import { invoke } from "@tauri-apps/api/core";

export async function createTerminal(distroName: string): Promise<string> {
  return invoke<string>("terminal_create", { distroName });
}

export async function writeTerminal(sessionId: string, data: Uint8Array): Promise<void> {
  return invoke("terminal_write", { sessionId, data: Array.from(data) });
}

export async function resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void> {
  return invoke("terminal_resize", { sessionId, cols, rows });
}

export async function closeTerminal(sessionId: string): Promise<void> {
  return invoke("terminal_close", { sessionId });
}
