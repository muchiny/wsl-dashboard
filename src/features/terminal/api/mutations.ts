import { invoke } from "@tauri-apps/api/core";
import { useMutation } from "@tanstack/react-query";
import { useTerminalStore } from "../model/use-terminal-store";
import { toast } from "@/shared/ui/toast-store";

export async function createTerminal(distroName: string): Promise<string> {
  return invoke<string>("terminal_create", { distroName });
}

export function useCreateTerminalSession() {
  return useMutation({
    mutationFn: (distroName: string) => createTerminal(distroName),
    onSuccess: (sessionId, distroName) => {
      useTerminalStore.getState().addSession({
        id: sessionId,
        distroName,
        title: distroName,
      });
    },
    onError: (err) => {
      toast.error(`Failed to open terminal: ${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

export async function writeTerminal(sessionId: string, data: Uint8Array): Promise<void> {
  return invoke("terminal_write", { sessionId, data: Array.from(data) });
}

export async function resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void> {
  return invoke("terminal_resize", { sessionId, cols, rows });
}

export async function isTerminalAlive(sessionId: string): Promise<boolean> {
  return invoke<boolean>("terminal_is_alive", { sessionId });
}

export async function closeTerminal(sessionId: string): Promise<void> {
  return invoke("terminal_close", { sessionId });
}
