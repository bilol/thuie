import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Keyword, ModerationAction, Report } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { KeywordService } from './services/keyword.service';
import { ModerationService } from './services/moderation.service';
import { ReportService } from './services/report.service';
import { ReportsController } from './controllers/reports.controller';

/**
 * §7 moderation pipeline + §6.12 reports. Exported services are the shared
 * primitives every content feature (infos, forum, alumni) injects to run the
 * scan → persist → audit write path and to accept reports.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Keyword, ModerationAction, Report]), NotificationsModule],
  controllers: [ReportsController],
  providers: [KeywordService, ModerationService, ReportService],
  exports: [KeywordService, ModerationService, ReportService],
})
export class ModerationModule {}
