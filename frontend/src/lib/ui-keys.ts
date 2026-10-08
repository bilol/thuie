/**
 * HeroUI Select/Autocomplete `onSelectionChange` hands back a React-Aria
 * `SharedSelection` (a Set-like with `currentKey`). This normalizes it to a
 * single string key so form state stays plain.
 */
export function singleKey(sel: unknown): string | undefined {
  if (sel == null) return undefined;
  if (typeof sel === "string" || typeof sel === "number") return String(sel);
  const s = sel as { currentKey?: string | number; selectedKeys?: Iterable<unknown> };
  if (s.currentKey != null) return String(s.currentKey);
  if (s.selectedKeys) {
    for (const k of s.selectedKeys) return String(k);
  }
  if (sel instanceof Set) {
    for (const k of sel) return String(k);
  }
  if (Array.isArray(sel) && sel.length) return String(sel[0]);
  return undefined;
}

export function multiKeys(sel: unknown): string[] {
  if (sel == null) return [];
  const iterable =
    sel instanceof Set
      ? (sel as Iterable<unknown>)
      : (sel as { selectedKeys?: Iterable<unknown> })?.selectedKeys;
  if (!iterable) return Array.isArray(sel) ? sel.map(String) : [];
  return [...iterable].map(String);
}
