import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheService } from './cache/cache.service';
import { AllExceptionsFilter } from './error/all-exceptions.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { SerializationInterceptor } from './interceptors/serialization.interceptor';

/**
 * BACKEND.md §11 cross-cutting layer, bound globally.
 *
 * Guard order matters: the {@link RateLimitGuard} runs first so throttling
 * (§10.1) applies to *public* surfaces (login/OTP) before the JWT check, and
 * {@link JwtAuthGuard} then enforces authn + the `role_strategies`/`@Roles`
 * gate (§3.1) on everything not marked `@Public()`.
 *
 * `CacheService` (the Redis seam) and the two guards/interceptor need `RoleService`,
 * which is exported by the global `AuthCoreModule` — so this module must be
 * imported *after* it in `AppModule`'s graph (Nest resolves globals regardless of
 * order, but keep it last for readability).
 */
@Global()
@Module({
  providers: [
    CacheService,

    // §5 — every thrown error becomes the RFC-7807-ish body.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // §10.1 token buckets, then §3.1 auth/strategy guards.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // §2 snake_case + null-drop serialization, then §2 idempotency replay.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SerializationInterceptor },
  ],
  exports: [CacheService],
})
export class CommonModule {}
