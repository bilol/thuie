import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from './auth.types';

/**
 * Everything cross-cutting that decorates controllers:
 *   @Public()              skip auth (§3 public list)
 *   @Roles('admin')        admin-only routes (§3.1)
 *   @RequiresStrategy('can_post_forum')  role_strategies flag gate (§3.1)
 *   @CurrentUser()         request user resolved by JwtAuthGuard
 */

export const IS_PUBLIC_KEY = 'thuie:public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'thuie:roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const STRATEGY_FLAG_KEY = 'thuie:strategyFlag';
export const RequiresStrategy = (flag: string) => SetMetadata(STRATEGY_FLAG_KEY, flag);

export const REQUIRES_VERIFIED_KEY = 'thuie:requiresVerified';
/** Content-writing endpoints: self-signup accounts must verify first (§3.2). */
export const RequiresVerified = () => SetMetadata(REQUIRES_VERIFIED_KEY, true);

export const RATE_LIMIT_KEY = 'thuie:rateLimit';
/**
 * BACKEND §10.1 token bucket on a named scope. `by` picks the bucket dimension:
 *   'ip'  — unauthenticated surfaces (login, forgot-password, resend, verify)
 *   'user' — per-account ceilings (content POST, search)
 *   'both' — the stricter of the two, used by §3.3 login protection
 */
export interface RateLimitSpec {
  scope: string;
  limit: number;
  windowSec: number;
  by: 'ip' | 'user' | 'both';
}
export const RateLimit = (spec: RateLimitSpec) => SetMetadata(RATE_LIMIT_KEY, spec);

/** `Idempotency-Key` replay guard for POSTs (§2 headers). */
export const IDEMPOTENT_KEY = 'thuie:idempotent';
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);

/** Request user attached by JwtAuthGuard after token + status checks. */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  department_id: string | null;
  status: 'unverified' | 'active' | 'posting_restricted' | 'banned' | 'deleted';
  is_admin: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
