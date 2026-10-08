import { create } from "zustand";
import { en, type Dictionary } from "./en";
import { zh } from "./zh";

export type Locale = "en" | "zh";

export const LOCALE_KEY = "thuie.locale";

/** BCP-47 tags for Intl / React-Aria (I18nProvider, date & number formatters). */
export const LOCALE_TAG: Record<Locale, string> = { en: "en-US", zh: "zh-CN" };

export const dictionaries: Record<Locale, Dictionary> = { en, zh };

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

/**
 * Locale lives outside React so plain modules (error copy, date formatters)
 * can read it too. Starts at "en" so the server HTML and the first client
 * render match; LocaleProvider flips it in an effect after mount.
 */
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
}));

export const currentLocale = (): Locale => useLocaleStore.getState().locale;

/** Live BCP-47 tag for the current locale (non-hook call sites). */
export const currentLocaleTag = (): string => LOCALE_TAG[currentLocale()];

/** Dictionary for the live locale — for non-hook call sites (errors.ts). */
export const getDict = (): Dictionary => dictionaries[currentLocale()];
