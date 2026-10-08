import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { CurrentUser, AuthUser } from '../../common/decorators';
import { ApiException } from '../../common/error/api.exception';
import { NotificationQueryDto } from '../dto/notification.dto';

/** §6.13 — the caller's inbox. All routes are `me`-scoped via the token. */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto) {
    return this.notifications.list(user.id, { cursor: query.cursor, limit: query.limit, unread: query.unread });
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: AuthUser) {
    const cleared = await this.notifications.markAllRead(user.id);
    return { cleared };
  }

  @Post(':id/read')
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const row = await this.notifications.markRead(user.id, id);
    if (!row) throw ApiException.notFound('Notification not found');
    return row;
  }
}
