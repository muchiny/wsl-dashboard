import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/translation.json";
import fr from "@/locales/fr/translation.json";
import es from "@/locales/es/translation.json";
import zh from "@/locales/zh/translation.json";

export const supportedLocales = ["en", "fr", "es", "zh"] as const;
export type Locale = (typeof supportedLocales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Fran\u00e7ais",
  es: "Espa\u00f1ol",
  zh: "\u4e2d\u6587 (Chinese)",
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    zh: { translation: zh },
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
