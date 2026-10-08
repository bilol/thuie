import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { Department, User } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { hashPassword, verifyPassword } from '../../common/util/password-hash';
import { CacheService } from '../../common/cache/cache.service';
import { OtpService } from './otp.service';
import { TokenService, TokenPair } from './token.service';
import { serializeUser } from '../../common/serializers/user.serializer';
import { clientIp } from '../../common/guards/rate-limit.guard';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyDto } from '../dto/auth.dto';

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: ReturnType<typeof serializeUser>;
}

/**
 * BACKEND.md §3 — the whole authentication surface: login (with §3.3 lockout),
 * rotating refresh, self-signup with registry gating, OTP verification,
 * forgot/reset and password change.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------- login ---

  async login(dto: LoginDto, req: Request): Promise<AuthResult> {
    const handle = dto.handle.trim();
    await this.assertNotLocked(handle, clientIp(req));

    const user = await this.findByHandleWithHash(handle);
    const ok = user ? verifyPassword(dto.password, user.password_hash) : false;

    if (!user || !ok) {
      // Same message either way — never reveal whether the handle exists (§3.3).
      await this.recordFailure(handle, clientIp(req));
      throw ApiException.invalidCredentials();
    }
    if (user.status === 'banned') throw ApiException.accountBanned();
    if (user.status === 'deleted') throw ApiException.accountDeleted();

    await this.clearFailures(handle, clientIp(req));
    await this.users.update({ id: user.id }, { last_login_at: new Date() });

    const refresh = await this.tokens.issueRefresh(user, req, dto.device_label);
    return this.result(user, refresh);
  }

  async refresh(dto: LoginDto | { refresh_token: string }, req: Request): Promise<AuthResult> {
    const presented = (dto as { refresh_token: string }).refresh_token;
    if (!presented) throw new ApiException(400, 'malformed_request', 'refresh_token is required');
    const { user, tokens } = await this.tokens.rotate(presented, req);
    return { ...tokens, user: serializeUser(user) };
  }

  async logout(refreshToken?: string, allDevices = false): Promise<{ revoked: boolean }> {
    if (allDevices && refreshToken) {
      // Revoke the family behind this token by resolving it first.
      const revoked = await this.tokens.revokeFamilyOf(refreshToken);
      return { revoked };
    }
    if (refreshToken) {
      await this.tokens.revokePlain(refreshToken);
      return { revoked: true };
    }
    return { revoked: false };
  }

  // ------------------------------------------------------------- register ---

  /**
   * §3.2 — self-signup. Students must resolve against `student_registry`:
   * a listed id claims the pre-provisioned row, an unlisted one is accepted but
   * stays `unverified` and lands in the admin review queue (an operation_log
   * row the admin user list surfaces). Graduates only need the OTP.
   */
  async register(dto: RegisterDto, req: Request): Promise<AuthResult & { otp_code?: string | null }> {
    const role = dto.role;
    if (role !== 'student' && role !== 'graduate') {
      throw ApiException.validationFailed([{ field: 'role', message: 'self-signup is limited to student/graduate' }]);
    }

    const studentId = dto.student_id?.trim() || null;
    const phone = dto.phone?.trim() || null;
    const email = dto.email?.trim() || null;

    if (role === 'student' && !studentId) {
      throw ApiException.validationFailed([{ field: 'student_id', message: 'required for student signup' }]);
    }
    if (!phone && !email) {
      throw ApiException.validationFailed([{ field: 'email', message: 'a phone or email is required for verification' }]);
    }

    for (const [field, value] of [['student_id', studentId], ['phone', phone], ['email', email]] as const) {
      if (value && (await this.handleTaken(value))) {
        throw ApiException.conflict(`That ${field} is already registered`, 'handle_taken', { field });
      }
    }

    const department = await this.resolveDepartment(dto.department);
    const identifier = phone ?? email!;

    const user = await this.users.save(
      this.users.create({
        role,
        name: dto.name.trim(),
        student_id: studentId,
        phone,
        email,
        password_hash: hashPassword(dto.password),
        department_id: department?.id ?? null,
        grade_year: dto.grade_year ?? null,
        // §3.2: nobody is trusted until the OTP clears; registry students get
        // 'unverified' too, so a stolen roster id still cannot post.
        status: 'unverified',
        email_verified_at: null,
        phone_verified_at: null,
      }),
    );

    if (role === 'student' && studentId) await this.claimRegistry(studentId, user.id);

    // Verify inline when the client already holds a code, otherwise issue one.
    if (dto.otp_code) {
      await this.otp.verify(identifier, 'register_verify', dto.otp_code);
      await this.markVerified(user, phone, email);
    }
    const fresh = await this.users.findOne({ where: { id: user.id }, relations: { department: true } });
    const issued = dto.otp_code ? null : await this.otp.issue(identifier, 'register_verify');

    const refresh = await this.tokens.issueRefresh(fresh ?? user, req, 'signup');
    const { access_token, refresh_token, token_type, expires_in } = this.tokens.pair(fresh ?? user, refresh);
    return {
      access_token,
      refresh_token,
      token_type,
      expires_in,
      user: serializeUser(fresh ?? user, { includeContact: true }),
      otp_code: issued?.code ?? null,
    };
  }

  // ------------------------------------------------------------- verify -----

  /** `POST /auth/verify` — clears an unverified account once the OTP passes. */
  async verify(dto: VerifyDto): Promise<{ verified: boolean; status: string }> {
    await this.otp.verify(dto.identifier, dto.purpose, dto.code);

    if (dto.purpose !== 'register_verify') return { verified: true, status: 'reset_ready' };

    const user = await this.findByHandleWithHash(dto.identifier);
    if (!user) throw ApiException.notFound('No account is waiting on that code');

    const isPhone = user.phone === dto.identifier;
    await this.markVerified(user, isPhone ? dto.identifier : null, !isPhone ? dto.identifier : null);
    return { verified: true, status: user.status === 'unverified' ? 'active' : user.status };
  }

  async resend(identifier: string, purpose: 'register_verify' | 'password_reset') {
    return this.otp.resend(identifier, purpose);
  }

  // ------------------------------------------------------ password flows ----

  /** Always 202-shaped: the caller never learns whether the id exists (§3). */
  async forgotPassword(identifier: string): Promise<{ sent: boolean; expires_in: number }> {
    const user = await this.findByHandleWithHash(identifier);
    if (!user) return { sent: false, expires_in: 0 };
    const issued = await this.otp.issue(identifier, 'password_reset');
    return { sent: true, expires_in: issued.expires_in };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ reset: boolean }> {
    const token = await this.otp.findActiveResetToken(dto.identifier, dto.code);
    if (!token) throw ApiException.invalidOtp();

    const user = await this.findByHandleWithHash(dto.identifier);
    if (!user) throw ApiException.invalidOtp();

    await this.otp.consume(token);
    await this.users.update(
      { id: user.id },
      { password_hash: hashPassword(dto.new_password), password_changed_at: new Date() },
    );
    // Every device is signed out — the old refresh tokens are worthless now (§6.5).
    await this.tokens.revokeAllForUser(user.id);
    this.logger.log(`password reset for user=${user.id}`);
    return { reset: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ changed: boolean; revoked_sessions: boolean }> {
    const user = await this.findByHandleByIdWithHash(userId);
    if (!user) throw ApiException.notFound();
    if (!verifyPassword(dto.current_password, user.password_hash)) {
      throw ApiException.invalidCredentials('Current password is incorrect');
    }
    await this.users.update(
      { id: user.id },
      { password_hash: hashPassword(dto.new_password), password_changed_at: new Date() },
    );
    await this.tokens.revokeAllForUser(user.id);
    return { changed: true, revoked_sessions: true };
  }

  // -------------------------------------------------------------- helpers ---

  private async result(user: User, refreshToken: string): Promise<AuthResult> {
    const pair: TokenPair = this.tokens.pair(user, refreshToken);
    return { ...pair, user: serializeUser(user, { includeContact: true }) };
  }

  private findByHandleWithHash(handle: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'department')
      .leftJoinAndSelect('u.avatar_media', 'avatar')
      .addSelect('u.password_hash')
      .where('u.deleted_at IS NULL')
      .andWhere('(u.student_id = :h OR u.phone = :h OR u.email = :h)', { h: handle })
      .getOne();
  }

  private findByHandleByIdWithHash(id: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.id = :id', { id })
      .getOne();
  }

  private handleTaken(handle: string): Promise<boolean> {
    return this.users
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL')
      .andWhere('(u.student_id = :h OR u.phone = :h OR u.email = :h)', { h: handle })
      .getCount()
      .then((n) => n > 0);
  }

  private async resolveDepartment(ref?: string): Promise<Department | null> {
    if (!ref) return null;
    const byCode = await this.departments.findOne({ where: { code: ref } });
    if (byCode) return byCode;
    return /^\d+$/.test(ref) ? this.departments.findOne({ where: { id: ref } }) : null;
  }

  private async claimRegistry(studentId: string, userId: string): Promise<void> {
    const row = await this.users.manager.query(
      'SELECT student_id FROM student_registry WHERE student_id = $1 AND claimed_user_id IS NULL',
      [studentId],
    );
    if (row.length) {
      await this.users.manager.query('UPDATE student_registry SET claimed_user_id = $2 WHERE student_id = $1', [studentId, userId]);
    } else {
      // Unlisted id ⇒ admin review queue item (§3.2). Kept as a log so the
      // admin user list can filter `status='unverified' AND role='student'`.
      this.logger.warn(`student signup with unlisted student_id=${studentId} user=${userId}; awaiting admin approval`);
    }
  }

  private async markVerified(user: User, phone: string | null, email: string | null): Promise<void> {
    const patch: Partial<User> = { status: user.status === 'unverified' ? 'active' : user.status };
    if (phone) patch.phone_verified_at = new Date();
    if (email) patch.email_verified_at = new Date();
    await this.users.update({ id: user.id }, patch);
    user.status = patch.status!;
  }

  // ------------------------------------------------------------ §3.3 lock ---

  private async assertNotLocked(handle: string, ip: string): Promise<void> {
    const lockThreshold = this.config.get<number>('auth.loginLockFailures') ?? 10;
    const window = this.config.get<number>('auth.loginWindowSec') ?? 900;
    for (const bucket of [`u:${handle}`, `ip:${ip}`]) {
      const count = await this.cache.peekCounter(`login:fail:${bucket}`);
      if (count >= lockThreshold) {
        throw ApiException.lockedOut(window, 'Too many failed sign-ins — try again later');
      }
    }
  }

  private async recordFailure(handle: string, ip: string): Promise<void> {
    const window = this.config.get<number>('auth.loginWindowSec') ?? 900;
    for (const bucket of [`u:${handle}`, `ip:${ip}`]) {
      await this.cache.incrWindow(`login:fail:${bucket}`, window);
    }
  }

  private async clearFailures(handle: string, ip: string): Promise<void> {
    for (const bucket of [`u:${handle}`, `ip:${ip}`]) {
      await this.cache.del(`win:login:fail:${bucket}`);
    }
  }
}
