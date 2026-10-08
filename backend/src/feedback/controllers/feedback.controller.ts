import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FeedbackService } from '../services/feedback.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { CreateFeedbackDto, MyFeedbackQueryDto } from '../dto/feedback.dto';

/** §6.15 `POST /feedback`. */
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(user, dto.content);
  }
}

/** §6.15 `GET /me/feedback` — caller-scoped list (shares `/me` with MeController). */
@Controller('me/feedback')
export class MyFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser, @Query() query: MyFeedbackQueryDto) {
    return this.feedback.mine(user, { cursor: query.cursor, limit: query.limit });
  }
}
