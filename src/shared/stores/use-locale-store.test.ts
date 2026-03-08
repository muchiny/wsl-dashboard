import { describe, it, expect, beforeEach } from "vitest";
import { useLocaleStore } from "./use-locale-store";

describe("useLocaleStore", () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: "en" });
  });

  describe("default values", () => {
    it("has default locale of 'en'", () => {
      expect(useLocaleStore.getState().locale).toBe("en");
    });
  });

  describe("setLocale", () => {
    it("changes locale to fr", () => {
      useLocaleStore.getState().setLocale("fr");
      expect(useLocaleStore.getState().locale).toBe("fr");
    });

    it("changes locale to es", () => {
      useLocaleStore.getState().setLocale("es");
      expect(useLocaleStore.getState().locale).toBe("es");
    });

    it("changes locale to zh", () => {
      useLocaleStore.getState().setLocale("zh");
      expect(useLocaleStore.getState().locale).toBe("zh");
    });

    it("changes locale back to en", () => {
      useLocaleStore.getState().setLocale("fr");
      useLocaleStore.getState().setLocale("en");
      expect(useLocaleStore.getState().locale).toBe("en");
    });
  });

  describe("available locales", () => {
    it("supports en, fr, es, zh locales", () => {
      const locales = ["en", "fr", "es", "zh"] as const;
      for (const loc of locales) {
        useLocaleStore.getState().setLocale(loc);
        expect(useLocaleStore.getState().locale).toBe(loc);
      }
    });
  });
});
