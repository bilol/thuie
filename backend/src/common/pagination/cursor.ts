import { ApiException } from '../error/api.exception';

/**
 * BACKEND.md §4 — opaque keyset cursors. A cursor is base64url JSON of the
 * sort key: { v: <primary sort value>, id: <tie-break id> }.
 * `nextCursor: null` ⇒ end of collection.
 */
export interface CursorPayload {
  v?: string | number | null;
  id?: string | number;
  [k: string]: unknown;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined | null): CursorPayload | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof json !== 'object' || json === null) throw new Error('not an object');
    return json as CursorPayload;
  } catch {
    throw ApiException.invalidCursor();
  }
}

/** Clamp limit to [1,50] — larger values silently reduced (§4). */
export function clampLimit(raw: unknown, fallback = 20): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 50);
}
