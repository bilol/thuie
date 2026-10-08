import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RATE_LIMIT_KEY, RateLimitSpec } from '../decorators';
import { ApiException } from '../error/api.exception';
import { CacheService } from '../cache/cache.service';

/**
 * BACKEND.md §10.1 — fixed-window buckets keyed per scope. Redis in production;
 * the in-memory CacheService keeps the same seam so the API runs standalone.
 * Over quota ⇒ 429 rate_limited with `details.retryAfter` (+ Retry-After header).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const spec = this.reflector.getAllAndOverride<RateLimitSpec>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!spec) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const buckets: string[] = [];
    if (spec.by === 'ip' || spec.by === 'both') buckets.push(`ip:${clientIp(req)}`);
    if ((spec.by === 'user' || spec.by === 'both') && req.user) buckets.push(`u:${req.user.id}`);
    if (buckets.length === 0) buckets.push(`ip:${clientIp(req)}`); // anonymous call on a user bucket

    let retryAfter = 0;
    for (const bucket of buckets) {
      const res = await this.cache.checkLimit(`rl:${spec.scope}:${bucket}`, spec.limit, spec.windowSec);
      if (!res.ok) retryAfter = Math.max(retryAfter, res.retryAfter);
    }
    if (retryAfter > 0) {
      const res = context.switchToHttp().getResponse<{ setHeader?: (k: string, v: string) => void }>();
      res.setHeader?.('Retry-After', String(retryAfter));
      throw ApiException.rateLimited(retryAfter);
    }
    return true;
  }
}

/** Trust only the leftmost XFF entry when present, else the socket address. */
export function clientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}
