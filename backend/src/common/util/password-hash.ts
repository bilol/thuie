import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing behind one seam. The contract specifies argon2id
 * (PROJECT §6.5); v0 uses Node's built-in scrypt to avoid the native `argon2`
 * build on Windows. Swapping = reimplement these two functions only.
 * Format: scrypt$<saltHex>$<hashHex>
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false; // NULL hash ⇒ cannot log in (system account)
  const [scheme, salt, hex] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const candidate = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
