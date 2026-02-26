import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, variant = "info", duration = 4000) => {
    const id = `toast-${++counter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration }] }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().add(message, "success"),
  error: (message: string) => useToastStore.getState().add(message, "error", 6000),
  warning: (message: string) => useToastStore.getState().add(message, "warning", 5000),
  info: (message: string) => useToastStore.getState().add(message, "info"),
};
