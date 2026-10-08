import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '../entities';
import { FeedbackService } from './services/feedback.service';
import { FeedbackController, MyFeedbackController } from './controllers/feedback.controller';

/** §6.15 feedback (user submission + own-thread listing). */
@Module({
  imports: [TypeOrmModule.forFeature([Feedback])],
  controllers: [FeedbackController, MyFeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
