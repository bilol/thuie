import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Comment, Department, ForumPost, InfoPost, NotificationPreference,
  PushToken, StudentRegistry, User,
} from '../entities';
import { MeController } from './controllers/me.controller';
import { MeService } from './services/me.service';
import { UsersService } from './services/users.service';

/**
 * §6.2 / §11 — the `users` bounded context. Exposes `UsersService` (the raw
 * user/registry accessor the JWT strategy and every other feature module needs)
 * and the `MeController` for caller-scoped routes. `RoleService` / `TokenService`
 * that `MeService` injects come from the global `AuthCoreModule`, so this module
 * does not import `AuthModule` (which would form a cycle via UsersService).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Department, StudentRegistry, InfoPost, ForumPost, Comment,
      PushToken, NotificationPreference,
    ]),
  ],
  controllers: [MeController],
  providers: [UsersService, MeService],
  exports: [UsersService, MeService],
})
export class UsersModule {}
