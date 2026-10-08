import { ValueTransformer } from 'typeorm';

/**
 * BIGINT columns arrive as JS strings (TypeORM never parses int8 to number),
 * which is exactly what the API wants: BACKEND.md §2 — ids serialize as
 * strings in JSON. Reuse one instance so metadata stays referentially stable.
 */
export const bigint: ValueTransformer = {
  to: (v?: number | string | null) => (v === undefined || v === null ? v : String(v)),
  from: (v?: string | number | null) => (v === undefined || v === null ? v : String(v)),
};

/** Same idea for the INT counter/status columns that we expose as strings too. */
export const asString: ValueTransformer = {
  to: (v?: number | string | null) => (v === undefined || v === null ? v : Number(v)),
  from: (v?: string | number | null) => (v === undefined || v === null ? v : Number(v)),
};
