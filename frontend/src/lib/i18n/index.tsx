"use client";

import * as React from "react";
import { en, type Dictionary } from "./en";
import {
  LOCALE_KEY,
  dictionaries,
  useLocaleStore,
  type Locale,
} from "./store";

export type { Locale, Dictionary };
export { dictionaries, LOCALE_TAG, currentLocale, currentLocaleTag, getDict, useLocaleStore } from "./store";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Active dictionary — use `t.common.confirm` etc. */
  t: Dictionary;
}

const I18nContext = React.createContext<I18nValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

/**
 * Mounts at "en" so the first client render matches the server HTML, then
 * applies the stored choice (or the browser language) in a post-hydration
 * effect and keeps `<html lang>` in sync.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const storeSetLocale = useLocaleStore((s) => s.setLocale);

  React.useEffect(() => {
    let detected: Locale | null = null;
    try {
      const stored = localStorage.getItem(LOCALE_KEY);
      if (stored === "en" || stored === "zh") detected = stored;
    } catch {
      /* private mode etc. */
    }
    if (!detected && navigator.language?.toLowerCase().startsWith("zh")) {
      detected = "zh";
    }
    if (detected) storeSetLocale(detected);
  }, [storeSetLocale]);

  React.useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const setLocale = React.useCallback(
    (l: Locale) => {
      storeSetLocale(l);
      try {
        localStorage.setItem(LOCALE_KEY, l);
      } catch {
        /* ignore */
      }
    },
    [storeSetLocale],
  );

  const value = React.useMemo<I18nValue>(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return React.useContext(I18nContext);
}

/** Governing-policy note under the auth cards (locale-aware). */
export function AuthFooter() {
  const { t } = useI18n();
  return <p className="mt-8 max-w-md text-center text-xs text-muted">{t.auth.footer}</p>;
}
