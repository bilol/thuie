import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Role, Visibility } from '../auth.types';
import { AuthUser } from '../decorators';

/**
 * BACKEND.md §3.1 — "visibility is a query predicate, not a filter".
 * Every read that can surface `student_only` / `admin_only` content must go
 * through these helpers, so a hidden row reads as absent (404 / not in feed)
 * rather than as a 403 that would leak existence across the boundary.
 */

/** Visibility values the viewer may see, in DB terms. */
export function visibleVisibilities(user: AuthUser | null | undefined): Visibility[] {
  if (!user) return ['all'];
  if (user.is_admin) return ['all', 'student_only', 'admin_only'];
  if (user.role === 'student') return ['all', 'student_only'];
  return ['all'];
}

/** Add the visibility predicate to a query builder for `alias`. */
export function applyVisibility<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, alias: string, user: AuthUser | null | undefined): SelectQueryBuilder<T> {
  const allowed = visibleVisibilities(user);
  return qb.andWhere(`${alias}.visibility IN (:...allowedVisibilities)`, { allowedVisibilities: allowed });
}

/** Only students (and admins) may read `internal` category infos (§6.6). */
export function canSeeInternal(user: AuthUser | null | undefined): boolean {
  return Boolean(user && (user.is_admin || user.role === 'student'));
}

/** Single-row check used by detail endpoints before returning a body. */
export function canView(record: { visibility?: Visibility; status?: string }, user: AuthUser | null | undefined): boolean {
  if (!record) return false;
  if (record.status && record.status !== 'approved') {
    // Authors always see their own non-approved row; admins see everything.
    return Boolean(user?.is_admin);
  }
  const visibility = (record.visibility ?? 'all') as Visibility;
  return visibleVisibilities(user).includes(visibility);
}

/** Alumni contact fields are gated in the response, not just the UI (§3.1). */
export function shouldExposeContact(viewer: AuthUser | null | undefined, targetUserId?: string | null): boolean {
  if (!viewer) return false;
  if (viewer.is_admin) return true;
  return Boolean(targetUserId && viewer.id === targetUserId);
}

/** Feed ordering shared by list endpoints; `-` prefix means DESC. */
export function parseSort(sort: string | undefined, allowed: string[], fallback: string): { field: string; dir: 'ASC' | 'DESC' } {
  const raw = sort?.trim();
  if (!raw) return { field: fallback, dir: 'DESC' };
  const desc = raw.startsWith('-');
  const field = (desc ? raw.slice(1) : raw).split('.')[0] as string;
  if (!allowed.includes(field)) return { field: fallback, dir: 'DESC' };
  return { field, dir: desc ? 'DESC' : 'ASC' };
}

/** Role helper used when a query needs "is this viewer a student" semantics. */
export function isStudent(role: Role | string): boolean {
  return role === 'student';
}
