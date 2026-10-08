import { registerAs } from '@nestjs/config';

/**
 * Env → typed config. Every value has a dev-safe default so `npm run start:dev`
 * boots without a .env; production must override JWT_SECRET / TICKET_SECRET.
 */
export const AppConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.GLOBAL_PREFIX ?? 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8080,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}));

export const DatabaseConfig = registerAs('db', () => ({
  url: process.env.DATABASE_URL ?? 'postgres://thuie:thuie@localhost:5432/thuie',
  // Contract DDL is authored in database/init/*.sql (npm run db:setup), so
  // schema synchronization stays OFF — TypeORM only maps the existing tables.
  synchronize: false,
  logging: (process.env.DB_LOGGING ?? 'warn') === 'true',
  maxConnections: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
}));

export const AuthConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-access-secret',
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? '30', 10),
  // §3.3 failed-login thresholds: 5 → backoff, 10 → lockout (§10.1)
  loginMaxFailures: parseInt(process.env.LOGIN_MAX_FAILURES ?? '5', 10),
  loginLockFailures: parseInt(process.env.LOGIN_LOCK_FAILURES ?? '10', 10),
  loginWindowSec: parseInt(process.env.LOGIN_WINDOW_SEC ?? '900', 10),
}));

export const OtpConfig = registerAs('otp', () => ({
  ttlMin: parseInt(process.env.OTP_TTL_MIN ?? '10', 10),
  maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
  resendCooldownSec: parseInt(process.env.OTP_RESEND_COOLDOWN_SEC ?? '60', 10),
  /** true ⇒ the code is logged instead of sent (no SMS/email provider in dev). */
  devMode: (process.env.OTP_DEV_MODE ?? 'true') !== 'false',
}));

export const TicketConfig = registerAs('ticket', () => ({
  secret: process.env.TICKET_SECRET ?? 'dev-only-ticket-secret',
  ttlMin: parseInt(process.env.TICKET_TTL_MIN ?? '10', 10),
}));

export const MediaConfig = registerAs('media', () => ({
  dir: process.env.MEDIA_DIR ?? './uploads',
  // §8.2 upload policy, in bytes
  maxImageBytes: 10 * 1024 * 1024,
  maxAvatarBytes: 5 * 1024 * 1024,
  maxAttachmentBytes: 25 * 1024 * 1024,
  signedTtlSec: parseInt(process.env.MEDIA_SIGNED_TTL_SEC ?? '900', 10),
  /** §8.4 orphan GC: unlinked uploads older than this are pruned. */
  orphanGcHours: parseInt(process.env.MEDIA_ORPHAN_GC_HOURS ?? '24', 10),
}));

export const RealtimeConfig = registerAs('realtime', () => ({
  namespace: process.env.WS_NAMESPACE ?? '/realtime',
}));

export const ALL_CONFIGS = [
  AppConfig, DatabaseConfig, AuthConfig, OtpConfig, TicketConfig, MediaConfig, RealtimeConfig,
];
