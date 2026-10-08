/**
 * Cross-cutting barrel (§11 `common/`). Deliberately excludes guards and
 * interceptors, which pull in module providers and would create import cycles.
 */
export * from './error/api.exception';
export * from './pagination/cursor';
export * from './pagination/page';
export * from './decorators';
export * from './auth.types';
export * from './util/column';
export * from './util/password-hash';
export * from './util/tokens';
export * from './util/version';
export * from './util/visibility';
export * from './serializers/user.serializer';
