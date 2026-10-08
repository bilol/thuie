import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department, PushToken, RefreshToken, RoleStrategy, StudentRegistry, User, VerificationToken } from '../entities';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './services/jwt.strategy';
import { OtpService } from './services/otp.service';
import { RoleService } from './services/role.service';
import { TokenService } from './services/token.service';
import { UsersModule } from '../users/users.module';

/**
 * BACKEND.md §3 — authentication context: login/refresh/register/OTP/reset,
 * access-token strategy, refresh-token rotation, and the `role_strategies`
 * reader that every guard consults (RoleService is re-exported app-wide).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Department, RefreshToken, VerificationToken, RoleStrategy, StudentRegistry, PushToken,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: { expiresIn: config.get<string>('auth.accessTtl') ?? '15m' },
      }),
    }),
    // UsersService backs the JWT strategy's account re-read.
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OtpService, JwtStrategy, RoleService],
  exports: [RoleService, TokenService, AuthService, OtpService, PassportModule],
})
export class AuthModule {}
