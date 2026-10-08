import { Injectable } from '@nestjs/common';

/**
 * Redis seam (BACKEND §1/§3.3/§6.12) — v0 keeps everything in process memory
 * so the API runs against Postgres alone. Swap this one class for an ioredis
 * implementation without touching callers.
 */
interface Entry { value: unknown; expiresAt: number }

@Injectable()
export class CacheService {
  private store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt < Date.now()) { this.store.delete(key); return null; }
    return e.value as T;
  }

  async set(key: string, value: unknown, ttlSec: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Fixed-window counter for login throttling / rate buckets. Returns count incl. this call. */
  async incrWindow(key: string, windowSec: number): Promise<{ count: number; retryAfter: number }> {
    const k = `win:${key}`;
    const existing = this.store.get(k);
    if (!existing || (existing.expiresAt as number) < Date.now()) {
      this.store.set(k, { value: 1, expiresAt: Date.now() + windowSec * 1000 });
      return { count: 1, retryAfter: windowSec };
    }
    const count = (existing.value as number) + 1;
    existing.value = count;
    return { count, retryAfter: Math.max(1, Math.ceil((existing.expiresAt - Date.now()) / 1000)) };
  }

  /** Read a fixed-window counter without incrementing (login lockout check). */
  async peekCounter(key: string): Promise<number> {
    const e = this.store.get(`win:${key}`);
    if (!e || e.expiresAt < Date.now()) return 0;
    return e.value as number;
  }

  /** Simple token-bucket-ish limiter used by guards. */
  async checkLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
    const { count, retryAfter } = await this.incrWindow(key, windowSec);
    return { ok: count <= max, retryAfter };
  }
}
