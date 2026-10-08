import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../entities';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationService } from './services/notification.service';
import { NotificationsController } from './controllers/notifications.controller';

/**
 * §6.13 notifications. `NotificationService` is exported so the moderation
 * pipeline, forum replies and (Phase 2) the realtime gateway can raise inbox
 * rows without each re-declaring the repository. It imports `RealtimeModule` so
 * `notify()` can push `notification:new` (§9.1 WS-first fan-out).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification]), RealtimeModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
