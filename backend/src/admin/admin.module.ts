import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AlumniProfile, Comment, Feedback, ForumPost, IdentityChangeLog, InfoPost, OperationLog, Report, User,
} from '../entities';
import { ModerationModule } from '../moderation/moderation.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminService } from './services/admin.service';
import { OperationLogService } from './services/operation-log.service';
import {
  AdminFeedbackController, AdminKeywordsController, AdminOperationLogsController, AdminReportsController,
  AdminReviewController, AdminRoleStrategiesController, AdminUsersController,
} from './controllers/admin.controller';

/**
 * §6.17 admin & trust operations. RoleService / TokenService come from the
 * global AuthCoreModule; KeywordService + ModerationService + ReportService from
 * ModerationModule; UsersService from UsersModule; NotificationService from
 * NotificationsModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([InfoPost, ForumPost, Comment, AlumniProfile, User, Report, IdentityChangeLog, Feedback, OperationLog]),
    ModerationModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [
    AdminReviewController, AdminReportsController, AdminKeywordsController,
    AdminUsersController, AdminFeedbackController, AdminRoleStrategiesController, AdminOperationLogsController,
  ],
  providers: [AdminService, OperationLogService],
})
export class AdminModule {}
