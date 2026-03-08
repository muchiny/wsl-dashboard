import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n, { loadLocale } from "@/shared/config/i18n";
import type { Locale } from "@/shared/config/i18n";

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

async function applyLocale(locale: Locale) {
  await loadLocale(locale);
  i18n.changeLanguage(locale);
  document.documentElement.setAttribute("lang", locale);
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => {
        applyLocale(locale);
        set({ locale });
      },
    }),
    {
      name: "wsl-nexus-locale",
      onRehydrateStorage: () => (state) => {
        if (state) applyLocale(state.locale);
      },
    },
  ),
);

/** Hook to keep i18next in sync — call once at app root */
export function useLocaleSync() {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    applyLocale(locale);
  }, [locale]);
}
