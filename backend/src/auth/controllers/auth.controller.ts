import { Body, Controller, HttpCode, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { Public, CurrentUser, RateLimit, AuthUser, RequiresVerified } from '../../common/decorators';
import {
  ChangePasswordDto, ForgotPasswordDto, LoginDto, LogoutDto, RefreshDto, RegisterDto, ResendDto, ResetPasswordDto, VerifyDto,
} from '../dto/auth.dto';

/**
 * BACKEND.md §6.1 / §3 — the public auth surface. Rate limits mirror §10.1:
 * login is bucketed per identifier *and* per IP, the OTP surfaces per IP.
 * `POST /auth/logout` and `PATCH /auth/password` are the two authenticated ones.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @HttpCode(200)
  @RateLimit({ scope: 'auth.login', limit: 10, windowSec: 60, by: 'both' })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, req);
  }

  @Public()
  @HttpCode(200)
  @RateLimit({ scope: 'auth.refresh', limit: 60, windowSec: 60, by: 'ip' })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto, req);
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refresh_token, dto.all_devices ?? false);
  }

  @Public()
  @RateLimit({ scope: 'auth.register', limit: 5, windowSec: 3600, by: 'ip' })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, req);
  }

  @Public()
  @HttpCode(200)
  @RateLimit({ scope: 'auth.verify', limit: 10, windowSec: 300, by: 'both' })
  @Post('verify')
  verify(@Body() dto: VerifyDto) {
    return this.auth.verify(dto);
  }

  @Public()
  @HttpCode(200)
  @RateLimit({ scope: 'auth.resend', limit: 3, windowSec: 900, by: 'both' })
  @Post('resend')
  resend(@Body() dto: ResendDto) {
    return this.auth.resend(dto.identifier, dto.purpose);
  }

  /** §3: always the same 202 shape — never reveals whether the id exists. */
  @Public()
  @HttpCode(202)
  @RateLimit({ scope: 'auth.forgot', limit: 5, windowSec: 3600, by: 'both' })
  @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.identifier);
  }

  @Public()
  @HttpCode(200)
  @RateLimit({ scope: 'auth.reset', limit: 10, windowSec: 600, by: 'both' })
  @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @RequiresVerified()
  @HttpCode(200)
  @Patch('password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }

  /** Convenience for the client's "send me a code first" step. */
  @Public()
  @HttpCode(200)
  @RateLimit({ scope: 'auth.resend', limit: 3, windowSec: 900, by: 'both' })
  @Post('otp')
  issueOtp(@Query('identifier') identifier: string, @Query('purpose') purpose: 'register_verify' | 'password_reset') {
    return this.auth.resend(identifier, purpose ?? 'register_verify');
  }
}
