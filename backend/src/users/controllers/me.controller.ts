import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MeService } from '../services/me.service';
import { CurrentUser, AuthUser } from '../../common/decorators';
import { CursorQuery } from '../../common/dto/query.dto';
import { NotificationType } from '../../common/auth.types';
import { ApiException } from '../../common/error/api.exception';
import {
  PushTokenDto, UpdateMeDto, UpdateNotificationPreferencesDto,
} from '../dto/me.dto';

/**
 * BACKEND.md §6.2 — everything scoped to "the caller". All routes require a
 * valid access token (the global guard), and each handler works purely from
 * `@CurrentUser()`, so no id can be spoofed across accounts.
 */
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  profile(@CurrentUser() user: AuthUser) {
    return this.me.me(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.me.updateMe(user.id, dto);
  }

  /** §6.13 soft delete — must be confirmed by re-entering the password upstream. */
  @Delete()
  remove(@CurrentUser() user: AuthUser) {
    return this.me.deleteAccount(user.id);
  }

  @Get('role-strategy')
  roleStrategy(@CurrentUser() user: AuthUser) {
    return this.me.roleStrategy(user.id);
  }

  // ------------------------------------------------------------- sessions ---

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.me.sessions(user.id);
  }

  @Delete('sessions')
  revokeOthers(@CurrentUser() user: AuthUser, @Req() req: Request & { familyId?: string }) {
    return this.me.revokeOtherSessions(user.id, req.familyId);
  }

  @Delete('sessions/:id')
  revokeOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.me.revokeSession(user.id, id);
  }

  // ----------------------------------------------------------- push tokens --

  @Post('push-token')
  registerPush(@CurrentUser() user: AuthUser, @Body() dto: PushTokenDto) {
    return this.me.registerPushToken(user.id, dto.token, dto.platform);
  }

  @Delete('push-token')
  unregisterPush(@CurrentUser() user: AuthUser, @Query('token') token?: string) {
    return this.me.unregisterPushToken(user.id, token);
  }

  // ------------------------------------------------------- my own content ---

  @Get('infos')
  infos(@CurrentUser() user: AuthUser, @Query() query: CursorQuery & { status?: string }) {
    return this.me.myInfos(user.id, { cursor: query.cursor, limit: query.limit, status: query.status });
  }

  @Get('posts')
  posts(@CurrentUser() user: AuthUser, @Query() query: CursorQuery & { status?: string }) {
    return this.me.myPosts(user.id, { cursor: query.cursor, limit: query.limit, status: query.status });
  }

  @Get('comments')
  comments(@CurrentUser() user: AuthUser, @Query() query: CursorQuery) {
    return this.me.myComments(user.id, { cursor: query.cursor, limit: query.limit });
  }

  // ------------------------------------------------------ notification prefs

  @Get('notification-preferences')
  preferences(@CurrentUser() user: AuthUser) {
    return this.me.notificationPreferences(user.id);
  }

  @Patch('notification-preferences')
  setPreference(@CurrentUser() user: AuthUser, @Body() dto: UpdateNotificationPreferencesDto) {
    if (typeof dto.muted !== 'boolean') throw ApiException.validationFailed([{ field: 'muted', message: 'required boolean' }]);
    return this.me.setNotificationPreference(user.id, dto.type as NotificationType, dto.muted);
  }
}
