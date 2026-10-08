import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorProfile, MentorshipApplication, User } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { MentorshipService } from './services/mentorship.service';
import {
  MentorshipApplicationsController,
  MentorsController,
  MyMentorProfileController,
} from './controllers/mentorship.controller';

/** §6.11 mentorship (mentor directory + applications). */
@Module({
  imports: [TypeOrmModule.forFeature([MentorProfile, MentorshipApplication, User]), NotificationsModule],
  controllers: [MentorsController, MyMentorProfileController, MentorshipApplicationsController],
  providers: [MentorshipService],
  exports: [MentorshipService],
})
export class MentorshipModule {}
