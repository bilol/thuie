import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RefreshToken, User } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { sha256hex, uuid, randomToken } from '../../common/util/tokens';
import { clientIp } from '../../common/guards/rate-limit.guard';
import { AuthUser } from '../../common/decorators';
import { Request } from 'express';

/** Access-token payload (§3): minimal, never carries PII. */
export interface AccessTokenClaims {
  sub: string;
  role: string;
  department_id: string | null;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * BACKEND.md §3 — short-lived JWT access + opaque rotating refresh tokens whose
 * sha256 lives in `refresh_tokens`. Rotation is family-based: replaying an
 * already-rotated token revokes every token in that family (§3.3/§6.5).
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  signAccess(user: User): { access_token: string; expires_in: number } {
    const jti = uuid();
    const claims: AccessTokenClaims = {
      sub: user.id,
      role: user.role,
      department_id: user.department_id,
      jti,
    };
    const access_token = this.jwt.sign(claims);
    return { access_token, expires_in: this.accessTtlSeconds() };
  }

  verifyAccess(raw: string): AccessTokenClaims {
    try {
      return this.jwt.verify<AccessTokenClaims>(raw);
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (msg.toLowerCase().includes('expired')) throw ApiException.tokenExpired();
      throw new ApiException(401, 'token_invalid', 'Missing or invalid access token');
    }
  }

  /** Issue a brand-new refresh row (login) — starts a fresh family. */
  async issueRefresh(user: User, req?: Request, deviceLabel?: string): Promise<string> {
    return this.createRefresh(user, uuid(), req, deviceLabel);
  }

  private async createRefresh(user: User, familyId: string, req?: Request, deviceLabel?: string): Promise<string> {
    const plain = randomToken(32);
    const ttlDays = this.config.get<number>('auth.refreshTtlDays') ?? 30;
    const row = this.refreshRepo.create({
      user_id: user.id,
      token_hash: sha256hex(plain),
      family_id: familyId,
      device_label: deviceLabel ?? null,
      ip: req ? (clientIp(req) || null) : null,
      expires_at: new Date(Date.now() + ttlDays * 86_400_000),
      last_used_at: new Date(),
    });
    await this.refreshRepo.save(row);
    return plain;
  }

  /**
   * Rotate: the presented token is revoked and replaced. A token that is
   * already revoked ⇒ reuse detected ⇒ whole family revoked (§3.3).
   */
  async rotate(presented: string, req?: Request): Promise<{ user: User; tokens: TokenPair }> {
    const row = await this.refreshRepo.findOne({
      where: { token_hash: sha256hex(presented) },
      relations: { user: { department: true, avatar_media: true } },
    });
    if (!row) throw ApiException.tokenReused('Unknown refresh token');

    if (row.revoked_at) {
      await this.revokeFamily(row.family_id);
      this.logger.warn(`Refresh-token reuse detected for user=${row.user_id}; family revoked`);
      throw ApiException.tokenReused();
    }
    if (row.expires_at < new Date()) throw ApiException.tokenExpired('Refresh token expired');

    const user = row.user;
    if (user.status === 'banned') throw ApiException.accountBanned();
    if (user.status === 'deleted') throw ApiException.accountDeleted();

    row.revoked_at = new Date();
    await this.refreshRepo.save(row);

    const newPlain = await this.createRefresh(user, row.family_id, req, row.device_label ?? undefined);
    return { user, tokens: this.pair(user, newPlain) };
  }

  pair(user: User, refreshToken: string): TokenPair {
    const { access_token, expires_in } = this.signAccess(user);
    return { access_token, refresh_token: refreshToken, token_type: 'Bearer', expires_in };
  }

  async revokePlain(presented: string): Promise<void> {
    await this.refreshRepo.update({ token_hash: sha256hex(presented) }, { revoked_at: new Date() });
  }

  /** Logout "all devices": resolve the presented token, drop its whole family. */
  async revokeFamilyOf(presented: string): Promise<boolean> {
    const row = await this.refreshRepo.findOne({ where: { token_hash: sha256hex(presented) } });
    if (!row) return false;
    await this.revokeFamily(row.family_id);
    return true;
  }

  revokeFamily(familyId: string): Promise<unknown> {
    return this.refreshRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked_at: new Date() })
      .where('family_id = :f AND revoked_at IS NULL', { f: familyId })
      .execute();
  }

  /** §6.5: password change invalidates every session. */
  revokeAllForUser(userId: string, exceptFamily?: string): Promise<unknown> {
    const qb = this.refreshRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked_at: new Date() })
      .where('user_id = :u AND revoked_at IS NULL', { u: userId });
    if (exceptFamily) qb.andWhere('family_id <> :f', { f: exceptFamily });
    return qb.execute();
  }

  /** Device management rows for `GET /me/sessions` (§12.3). */
  listSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshRepo.find({
      where: { user_id: userId, revoked_at: IsNull() },
      order: { created_at: 'DESC' },
    });
  }

  sessionView(rows: RefreshToken[], currentFamily?: string) {
    return rows.map((r) => ({
      id: r.id,
      device_label: r.device_label,
      ip: r.ip,
      created_at: r.created_at,
      last_used_at: r.last_used_at,
      expires_at: r.expires_at,
      current: currentFamily ? r.family_id === currentFamily : false,
    }));
  }

  revokeSession(userId: string, sessionId: string): Promise<boolean> {
    return this.refreshRepo
      .update({ id: sessionId, user_id: userId }, { revoked_at: new Date() })
      .then((r) => (r.affected ?? 0) > 0);
  }

  /**
   * Whether an access token predates the last password change (§6.5). The
   * iat<->password_changed_at comparison belongs in the JWT strategy validate().
   */
  isStaleAgainstPasswordChange(claims: AccessTokenClaims, user: User): boolean {
    if (!user.password_changed_at || !claims.iat) return false;
    return claims.iat * 1000 < user.password_changed_at.getTime();
  }

  /** AuthUser attached to req by the strategy. */
  toAuthUser(user: User): AuthUser {
    return user.toAuthUser();
  }

  private accessTtlSeconds(): number {
    const ttl = this.config.get<string>('auth.accessTtl') ?? '15m';
    const m = ttl.match(/^(\d+)([smh])$/);
    if (!m) return 900;
    const n = parseInt(m[1], 10);
    return m[2] === 's' ? n : m[2] === 'm' ? n * 60 : n * 3600;
  }
}
