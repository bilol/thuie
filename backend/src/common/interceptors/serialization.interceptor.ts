import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * BACKEND.md §2 — responses are snake_case (entity properties already are) with
 * two normalizations applied on the way out:
 *   • null / undefined fields are dropped, so a gated field (e.g. an alumni
 *     `wechat` behind wechat_visibility) that the service nulled simply vanishes
 *     rather than reading as `null`;
 *   • bigint ids stay strings (§2) — the entity transformer already guarantees it.
 * Envelope objects ({ data, meta }) pass through with the same treatment applied
 * to each row.
 */
@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => clean(value)));
  }
}

function clean(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return undefined;
  if (depth > 12) return value; // recursion guard
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw === undefined) continue;
    // Guard against accidentally serializing an eagerly-loaded relation object
    // where only the *_id column belongs in the payload.
    if (key === 'password_hash' || key === 'token_hash' || key === 'code_hash') continue;
    // Pagination meta keeps its nulls — `nextCursor: null` is the end-of-feed
    // signal (§4), so it must survive serialization.
    if (key === 'meta') {
      out[key] = raw;
      continue;
    }
    const cleaned = clean(raw, depth + 1);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}
