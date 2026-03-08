import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/translation.json";

export const supportedLocales = ["en", "fr", "es", "zh"] as const;
export type Locale = (typeof supportedLocales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Fran\u00e7ais",
  es: "Espa\u00f1ol",
  zh: "\u4e2d\u6587 (Chinese)",
};

type TranslationModule = { default: typeof en };

const localeLoaders: Record<Locale, () => Promise<TranslationModule>> = {
  en: () => Promise.resolve({ default: en }),
  fr: () => import("@/locales/fr/translation.json") as Promise<TranslationModule>,
  es: () => import("@/locales/es/translation.json") as Promise<TranslationModule>,
  zh: () => import("@/locales/zh/translation.json") as Promise<TranslationModule>,
};

/** Dynamically load a locale bundle and register it with i18next. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (i18n.hasResourceBundle(locale, "translation")) return;
  const module = await localeLoaders[locale]();
  i18n.addResourceBundle(locale, "translation", module.default, true, true);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  ns: ["translation"],
  defaultNS: "translation",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
