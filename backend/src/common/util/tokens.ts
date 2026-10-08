import { createHash, randomBytes, randomUUID, createHmac } from 'node:crypto';

/** sha256 hex — refresh-token / OTP storage hashes (§6.5, §3.2). */
export function sha256hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Opaque URL-safe token (refresh tokens: server stores only the sha256). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** 6-digit numeric OTP for verify / password-reset flows. */
export function numericOtp(): string {
  return String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, '0');
}

export function uuid(): string {
  return randomUUID();
}

/** Constant-time HMAC compare for signed tickets (§6.10). */
export function hmacSha256(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}
