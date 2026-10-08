import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ApiException } from '../error/api.exception';
import { AuthUser, IS_PUBLIC_KEY, REQUIRES_VERIFIED_KEY, ROLES_KEY, STRATEGY_FLAG_KEY } from '../decorators';
import { Role, StrategyFlag } from '../auth.types';
import { RoleService } from '../../auth/services/role.service';

/**
 * BACKEND.md §3.1 — every non-public route needs a valid access token, and the
 * user behind it must still be in a login-able state. Checks, in order:
 *   1. @Public()                        → pass through
 *   2. Bearer JWT (signature + exp)     → 401 token_invalid
 *   3. password_changed_at > iat        → 401 token_revoked (§6.5)
 *   4. status: banned / deleted         → 403 account_banned / account_deleted
 *   5. @RequiresVerified() + unverified → 403 account_unverified (§3.2)
 *   6. @Roles(...)                      → 403 insufficient_role
 *   7. @RequiresStrategy(flag)          → 403 feature_disabled (§3.1)
 * Admin roles (admin/admin_super) bypass the strategy table — it only models
 * what students/graduates may see, matching the client's RoleStrategy.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: RoleService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public routes never touch the Bearer token (§3 public list).
    if (this.isPublic(context)) return true;

    await super.canActivate(context);
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    const user = req.user;
    if (!user) throw new UnauthorizedException({ code: 'token_invalid', message: 'Missing or invalid access token' });

    if (user.status === 'banned') throw ApiException.accountBanned();
    if (user.status === 'deleted') throw ApiException.accountDeleted();

    if (this.getMeta<boolean>(REQUIRES_VERIFIED_KEY, context) && user.status === 'unverified') {
      throw ApiException.accountUnverified();
    }

    const roles = this.getMeta<Role[]>(ROLES_KEY, context);
    if (roles?.length && !roles.includes(user.role)) throw ApiException.insufficientRole();

    const flag = this.getMeta<StrategyFlag>(STRATEGY_FLAG_KEY, context);
    if (flag && !(await this.roleService.userHasFlag(user, flag))) throw ApiException.featureDisabled(flag);

    return true;
  }

  handleRequest<TUser = any>(err: any, user: any): TUser {
    // Let our own ApiException from validate() bubble up untouched.
    if (err instanceof ApiException) throw err;
    if (err || !user) throw err ?? new UnauthorizedException({ code: 'token_invalid', message: 'Missing or invalid access token' });
    return user;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.getMeta<boolean>(IS_PUBLIC_KEY, context) === true;
  }

  /** Handler-level metadata wins over controller-level. */
  private getMeta<T>(key: string, context: ExecutionContext): T | undefined {
    return this.reflector.getAllAndOverride<T>(key, [context.getHandler(), context.getClass()]);
  }
}
