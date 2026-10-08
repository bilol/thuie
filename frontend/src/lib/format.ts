/** Display formatting. All API `*_at` fields are ISO-UTC (BACKEND.md §2). */
import { LOCALE_TAG, currentLocale, type Locale } from "@/lib/i18n/store";

export function formatDate(iso: string | null | undefined, locale = currentLocale()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string | null | undefined, locale = currentLocale()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Relative "5m / 3h / 2d ago" for feeds (locale-aware). */
export function timeAgo(iso: string | null | undefined, locale = currentLocale()): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[locale], { numeric: "auto" });
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
    ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return "";
}

export function compactCount(n: number | null | undefined): string {
  if (n == null) return "0";
  return new Intl.NumberFormat(LOCALE_TAG[currentLocale()], {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Picks the locale-appropriate `name_zh` / `name_en` from a bilingual entity (department / faculty). */
export function localizedName(
  e: { name_en?: string | null; name_zh?: string | null } | null | undefined,
  locale: Locale = currentLocale(),
): string {
  if (!e) return "";
  return (locale === "zh" ? e.name_zh || e.name_en : e.name_en || e.name_zh) ?? "";
}
