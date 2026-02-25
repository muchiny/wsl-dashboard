import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "dark" ? "light" : "dark";
          applyTheme(next);
          return { theme: next };
        }),
    }),
    {
      name: "wsl-nexus-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

/** Hook to keep DOM in sync — call once at app root */
export function useThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
}
