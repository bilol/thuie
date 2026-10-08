"use client";

import { OptionSelect } from "@/components/common/option-select";
import { cn } from "@/lib/utils";
import { dictionaries, useI18n, type Locale } from "@/lib/i18n";

/**
 * Each language names itself: `meta.name` is the endonym declared inside that
 * dictionary ("English" / "简体中文"), so the option list is read from the
 * dictionaries themselves — never from the active one (an endonym does not
 * translate) and never hardcoded here.
 */
const OPTIONS = (Object.keys(dictionaries) as Locale[]).map((l) => ({
  key: l,
  label: dictionaries[l].meta.name,
}));

/** Language picker for the app header and the public auth shell. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <OptionSelect
      ariaLabel={t.meta.toggleAria}
      className={cn("w-28 sm:w-36", className)}
      value={locale}
      onChange={(k) => k && setLocale(k as Locale)}
      options={OPTIONS}
    />
  );
}
