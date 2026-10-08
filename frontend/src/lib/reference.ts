/**
 * Curated option lists shared by the alumni profile form, the directory detail
 * card and the admin users screen. Values are stored as stable keys (industry)
 * or the code itself (program), never the localized label, so en/zh display can
 * change without touching persisted rows — mirrors the lib/nationalities.ts
 * approach (Country reuses NATIONALITIES + nationalityLabel directly).
 */

/** Program codes on users.program (§6.17). Single source of truth across web + admin. */
export const PROGRAMS = ["MEM", "IMEM", "GMA"] as const;

export interface IndustryOption {
  /** Stable key persisted on alumni_profiles.industry. */
  key: string;
  en: string;
  zh: string;
}

export const INDUSTRIES: IndustryOption[] = [
  { key: "internet", en: "Internet / Technology", zh: "互联网 / 科技" },
  { key: "finance", en: "Finance & Investment", zh: "金融投资" },
  { key: "consulting", en: "Consulting", zh: "咨询" },
  { key: "manufacturing", en: "Manufacturing", zh: "制造业" },
  { key: "energy", en: "Energy", zh: "能源" },
  { key: "healthcare", en: "Healthcare", zh: "医疗健康" },
  { key: "education", en: "Education", zh: "教育" },
  { key: "real_estate", en: "Real Estate", zh: "房地产" },
  { key: "retail", en: "Retail & E-commerce", zh: "零售与电商" },
  { key: "media", en: "Media & Marketing", zh: "传媒与市场营销" },
  { key: "logistics", en: "Transportation & Logistics", zh: "交通运输与物流" },
  { key: "telecom", en: "Telecommunications", zh: "通信" },
  { key: "public", en: "Public Sector", zh: "政府与公共事业" },
  { key: "other", en: "Other", zh: "其他" },
];

const BY_INDUSTRY: Record<string, IndustryOption> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.key, i]),
);

/** Localized industry name for a stored key. Unknown/legacy free-text values fall
 *  back to the raw string so historical rows still render instead of blanking. */
export function industryLabel(key: string | null | undefined, locale: string): string {
  if (!key) return "";
  const hit = BY_INDUSTRY[key];
  if (!hit) return key;
  return locale === "zh" ? hit.zh : hit.en;
}
