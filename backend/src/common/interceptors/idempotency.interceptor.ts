import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { Request } from 'express';
import { CacheService } from '../cache/cache.service';
import { IDEMPOTENT_KEY } from '../decorators';

/**
 * BACKEND.md §2 — POST handlers may be marked @Idempotent(): when the client
 * sends an `Idempotency-Key`, a replay of the same (user, route, key) returns
 * the first response instead of performing the write twice. Double-tap posting,
 * retried registration and "create conversation" dedup all ride on this.
 * v0 caches in the same seam as Redis (CacheService); 24 h retention.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled(context)) return next.handle();

    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !key.trim()) return next.handle();

    const bucket = req.user?.id ?? 'anon';
    const cacheKey = `idem:${bucket}:${req.route?.path ?? req.url}:${key.trim()}`;

    return from(this.cache.get<unknown>(cacheKey)).pipe(
      switchMap((hit) =>
        hit !== null
          ? of(hit)
          : next.handle().pipe(
              // Only successful bodies are memoized; failures let the client retry.
              tap((value) => void this.cache.set(cacheKey, value, 24 * 3600)),
            ),
      ),
    );
  }

  private enabled(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true;
  }
}
