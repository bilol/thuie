import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { VerificationToken } from '../../entities';
import { OtpPurpose } from '../../common/auth.types';
import { ApiException } from '../../common/error/api.exception';
import { numericOtp, sha256hex } from '../../common/util/tokens';

/**
 * BACKEND.md §3.2 — one OTP engine for both flows (register_verify and
 * password_reset). Codes are stored hashed, expire on a TTL, and lock after
 * `attempts` wrong tries. Delivery is a log line in dev (OTP_DEV_MODE=true);
 * the seam is `deliver()` — swap it for SMS/e-mail providers without touching
 * the callers.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(VerificationToken) private readonly repo: Repository<VerificationToken>,
    private readonly config: ConfigService,
  ) {}

  /** Issues a code and returns it only in dev mode (never in production). */
  async issue(identifier: string, purpose: OtpPurpose): Promise<{ code: string | null; expires_in: number }> {
    const ttlMin = this.config.get<number>('otp.ttlMin') ?? 10;
    const code = numericOtp();
    await this.repo.save(
      this.repo.create({
        identifier,
        purpose,
        code_hash: sha256hex(code),
        expires_at: new Date(Date.now() + ttlMin * 60_000),
      }),
    );
    await this.deliver(identifier, purpose, code);
    const dev = this.config.get<boolean>('otp.devMode') ?? false;
    return { code: dev ? code : null, expires_in: ttlMin * 60 };
  }

  /** Rate-limited re-issue (§10.1 resend cooldown). */
  async resend(identifier: string, purpose: OtpPurpose): Promise<{ code: string | null; expires_in: number }> {
    const cooldown = this.config.get<number>('otp.resendCooldownSec') ?? 60;
    const latest = await this.repo.findOne({
      where: { identifier, purpose },
      order: { created_at: 'DESC' },
    });
    if (latest) {
      const ageSec = (Date.now() - latest.created_at.getTime()) / 1000;
      if (ageSec < cooldown) {
        throw ApiException.rateLimited(Math.ceil(cooldown - ageSec), 'Please wait before requesting a new code');
      }
    }
    return this.issue(identifier, purpose);
  }

  /**
   * Validates and consumes the newest live code for (identifier, purpose).
   * Wrong/attempts-exhausted/expired all read identically to the client
   * (`invalid_code`) so nothing about the stored state leaks.
   */
  async verify(identifier: string, purpose: OtpPurpose, code: string): Promise<void> {
    const maxAttempts = this.config.get<number>('otp.maxAttempts') ?? 5;
    const active = await this.repo.findOne({
      where: { identifier, purpose, consumed_at: IsNull() },
      order: { created_at: 'DESC' },
    });
    if (!active || active.expires_at < new Date()) throw ApiException.invalidOtp('Code expired — request a new one');
    if (active.attempts >= maxAttempts) throw ApiException.invalidOtp('Too many wrong attempts — request a new code');

    if (sha256hex(code) !== active.code_hash) {
      active.attempts += 1;
      await this.repo.save(active);
      if (active.attempts >= maxAttempts) {
        active.consumed_at = new Date();
        await this.repo.save(active);
        throw ApiException.invalidOtp('Too many wrong attempts — request a new code');
      }
      throw ApiException.invalidOtp();
    }

    active.consumed_at = new Date();
    await this.repo.save(active);
  }

  /** Reset flow: the OTP doubles as the single-use reset token (§3). */
  async findActiveResetToken(identifier: string, code: string): Promise<VerificationToken | null> {
    const row = await this.repo.findOne({
      where: { identifier, purpose: 'password_reset', consumed_at: IsNull() },
      order: { created_at: 'DESC' },
    });
    if (!row || row.expires_at < new Date()) return null;
    if (sha256hex(code) !== row.code_hash) return null;
    return row;
  }

  consume(row: VerificationToken): Promise<unknown> {
    return this.repo.update({ id: row.id }, { consumed_at: new Date() });
  }

  /** Delivery seam. Dev mode logs the cleartext; production must implement senders. */
  private async deliver(identifier: string, purpose: OtpPurpose, code: string): Promise<void> {
    if (this.config.get<boolean>('otp.devMode') ?? true) {
      this.logger.log(`OTP for ${identifier} (${purpose}): ${code}  [dev mode — not sent]`);
      return;
    }
    this.logger.log(`OTP dispatch requested for ${identifier} (${purpose})`);
    // TODO(build): wire SMS (Aliyun/FCM) + SMTP providers here.
  }
}
