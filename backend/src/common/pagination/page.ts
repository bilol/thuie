/** Response envelopes per BACKEND.md §4. */

export interface CursorPage<T> {
  data: T[];
  meta: { nextCursor: string | null; limit: number; total_estimate?: number };
}

export interface OffsetPage<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function cursorPage<T>(rows: T[], limit: number, nextCursor: string | null): CursorPage<T> {
  // Callers fetch limit+1 rows; the overflow row is dropped here and the cursor
  // for the last kept row is what the caller passed in (null ⇒ end of feed).
  const data = rows.length > limit ? rows.slice(0, limit) : rows;
  return { data, meta: { nextCursor, limit } };
}

export function offsetPage<T>(data: T[], page: number, limit: number, total: number): OffsetPage<T> {
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
