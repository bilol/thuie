import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_CONFIGS } from './config/configuration';
import { buildDataSourceOptions } from './config/datasource';
import { requestId } from './common/middleware/request-id';
import { CommonModule } from './common/common.module';
import { AuthCoreModule } from './auth/auth-core.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { DepartmentsModule } from './departments/departments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ModerationModule } from './moderation/moderation.module';
import { InfosModule } from './infos/infos.module';
import { ForumModule } from './forum/forum.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ConnectionsModule } from './connections/connections.module';
import { AlumniModule } from './alumni/alumni.module';
import { FacultyModule } from './faculty/faculty.module';
import { EventsModule } from './events/events.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { MessagingModule } from './messaging/messaging.module';
import { MediaModule } from './media/media.module';
import { SearchModule } from './search/search.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AdminModule } from './admin/admin.module';
import { RealtimeModule } from './realtime/realtime.module';

/**
 * BACKEND.md §11 root composition. Boot order:
 *   1. ConfigModule (global) loads `ALL_CONFIGS` from the environment.
 *   2. TypeORM connects via the shared `buildDataSourceOptions` — DDL is
 *      authored in `database/init/*.sql`, so `synchronize` stays off.
 *   3. `AuthCoreModule` (@Global token/role/OTP primitives) must precede
 *      `CommonModule`, whose global `JwtAuthGuard` injects `RoleService`.
 *   4. Feature modules register here as they are built (§6 catalog).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: ALL_CONFIGS }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions(config.get<string>('db.url')),
    }),
    AuthCoreModule,
    CommonModule,
    AuthModule,
    UsersModule,
    HealthModule,
    DepartmentsModule,
    NotificationsModule,
    ModerationModule,
    InfosModule,
    ForumModule,
    FavoritesModule,
    ConnectionsModule,
    AlumniModule,
    FacultyModule,
    EventsModule,
    MentorshipModule,
    MessagingModule,
    MediaModule,
    SearchModule,
    FeedbackModule,
    AdminModule,
    RealtimeModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // §5 / §2: assign + echo X-Request-Id on every route.
    consumer.apply(requestId).forRoutes('*');
  }
}
