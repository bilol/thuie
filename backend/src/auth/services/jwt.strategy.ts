import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/services/users.service';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { AccessTokenClaims } from './token.service';

/**
 * BACKEND.md §3.1 — decodes the access JWT and re-reads the account so a
 * ban/delete/password-change that happened *after* the token was issued still
 * takes effect within the token's short TTL. Returns the AuthUser that
 * JwtAuthGuard then gates on.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.jwtSecret') ?? 'dev-only-access-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, claims: AccessTokenClaims): Promise<AuthUser> {
    const user = await this.users.findById(claims.sub);
    if (!user) throw ApiException.tokenRevoked('Account no longer exists');
    if (user.status === 'deleted') throw ApiException.accountDeleted();
    if (user.status === 'banned') throw ApiException.accountBanned();

    // §6.5 — tokens issued before the last password change are dead.
    if (user.password_changed_at && claims.iat) {
      if (claims.iat * 1000 < user.password_changed_at.getTime()) {
        throw ApiException.tokenRevoked('Token issued before the last password change');
      }
    }

    const auth = user.toAuthUser();
    req.user = auth;
    return auth;
  }
}
