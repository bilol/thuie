/**
 * Client-side CSV helpers for the admin console's export / import affordances.
 * No backend dependency: export serialises the rows already loaded in the table,
 * import parses a chosen .csv into plain objects the caller maps onto its own
 * create endpoints. RFC-4180-ish (quoted fields, "" escapes, CRLF/LF).
 */

export interface CsvColumn<T> {
  /** Stable id for the column (used as the export header fallback). */
  key: string;
  /** Localized header text written to the CSV. */
  header: string;
  /** Cell value extractor; nullish cells become empty strings. */
  value: (row: T) => string | number | boolean | null | undefined;
}

/** Quote a cell only when it contains a delimiter / quote / newline. */
function escapeCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from a column spec + rows (CRLF line endings). */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCell(c.value(r))).join(","))
    .join("\r\n");
  return body ? `${head}\r\n${body}` : head;
}

/** Trigger a browser download of `rows` as a UTF-8 CSV (BOM for Excel/CJK). */
export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const csv = toCsv(columns, rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Split one CSV line, honouring quoted fields with embedded delimiters/newlines. */
function splitRow(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

/**
 * Parse CSV text into row objects keyed by the header row. Blank lines are
 * skipped; a UTF-8 BOM is stripped. Keys are trimmed but otherwise unmodified,
 * so callers match on the exact header strings they exported.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const header = splitRow(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}
