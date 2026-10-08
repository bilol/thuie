import { ApiException } from '../error/api.exception';

/**
 * Optimistic concurrency (BACKEND.md §2): every author-editable resource has a
 * `version` int. PATCH must present the client's version (body `version` or
 * `If-Match` header — controllers normalize both into one value before
 * calling this). Mismatch ⇒ 412 version_conflict, no silent lost updates.
 */
export function assertVersion(current: number, presented: unknown): void {
  if (presented === undefined || presented === null) return; // absent ⇒ skip (documented permissiveness for v0)
  if (Number(presented) !== Number(current)) {
    throw ApiException.versionConflict(`Resource is at version ${current}, request assumed ${presented}`);
  }
}

export function bumpVersion(current: number): number {
  return Number(current) + 1;
}
