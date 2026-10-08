import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department, RefreshToken, RoleStrategy, User, VerificationToken } from '../entities';
import { OtpService } from './services/otp.service';
import { RoleService } from './services/role.service';
import { TokenService } from './services/token.service';

/**
 * Global auth *primitives* — token issuing/rotation, the `role_strategies`
 * reader every guard uses, and the OTP engine. Living in a @Global module lets
 * UsersModule / ForumModule / AdminModule inject them without importing
 * AuthModule (which would create a circular module graph via the JWT strategy's
 * dependency on UsersService).
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Department, RefreshToken, VerificationToken, RoleStrategy]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: { expiresIn: config.get<string>('auth.accessTtl') ?? '15m' },
      }),
    }),
  ],
  providers: [TokenService, RoleService, OtpService],
  exports: [TokenService, RoleService, OtpService, JwtModule],
})
export class AuthCoreModule {}
