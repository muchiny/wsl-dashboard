import { create } from "zustand";

export interface TerminalSession {
  id: string;
  distroName: string;
  title: string;
}

interface TerminalStore {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  isOpen: boolean;
  panelHeight: number;
  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setPanelHeight: (height: number) => void;
}

export const useTerminalStore = create<TerminalStore>()((set) => ({
  sessions: [],
  activeSessionId: null,
  isOpen: false,
  panelHeight: 300,

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
      isOpen: true,
    })),

  removeSession: (id) =>
    set((state) => {
      const remaining = state.sessions.filter((s) => s.id !== id);
      const wasActive = state.activeSessionId === id;
      return {
        sessions: remaining,
        activeSessionId: wasActive
          ? (remaining[remaining.length - 1]?.id ?? null)
          : state.activeSessionId,
        isOpen: remaining.length > 0 ? state.isOpen : false,
      };
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  setPanelHeight: (height) => set({ panelHeight: Math.max(150, Math.min(600, height)) }),
}));
