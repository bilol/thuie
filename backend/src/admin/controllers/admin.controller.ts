import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { ModerationTargetType } from '../../common/auth.types';
import { PageQuery } from '../../common/dto/query.dto';
import {
  AdminFeedbackQueryDto, AdminUsersQueryDto, BatchConvertDto, ConvertUserDto, CreateUserDto, KeywordCreateDto, KeywordUpdateDto,
  RejectDto, ReplyFeedbackDto, ReportsQueryDto, ResolveReportDto, ReviewQueueQueryDto, RoleStrategyUpdateDto,
  TakedownDto, UpdateUserDto, UpdateUserStatusDto,
} from '../dto/admin.dto';
import { OperationLogService } from '../services/operation-log.service';

/** §6.17 review queue + approve / reject / takedown / history. */
@Roles('admin', 'admin_super')
@Controller('admin')
export class AdminReviewController {
  constructor(private readonly admin: AdminService) {}

  @Get('review')
  queue(@Query() query: ReviewQueueQueryDto) {
    return this.admin.reviewQueue(query);
  }

  @Post('review/:type/:id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('type') type: ModerationTargetType, @Param('id') id: string) {
    return this.admin.approve(user, type, id);
  }

  @Post('review/:type/:id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('type') type: ModerationTargetType, @Param('id') id: string, @Body() dto: RejectDto) {
    return this.admin.reject(user, type, id, dto.reason);
  }

  @Post('takedown')
  takedown(@CurrentUser() user: AuthUser, @Body() dto: TakedownDto) {
    return this.admin.takedown(user, dto.target_type, dto.target_id, dto.reason);
  }

  @Get('moderation-history/:type/:id')
  history(@Param('type') type: ModerationTargetType, @Param('id') id: string) {
    return this.admin.history(type, id);
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }
}

/** §6.17 reports queue + resolve. */
@Roles('admin', 'admin_super')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  queue(@Query() query: ReportsQueryDto) {
    return this.admin.reportsQueue(query);
  }

  @Post(':id/resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.admin.resolveReport(user, id, dto.outcome, dto.note);
  }
}

/** §6.17 keyword dictionary CRUD (busts the keyword cache). */
@Roles('admin', 'admin_super')
@Controller('admin/keywords')
export class AdminKeywordsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listKeywords();
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: KeywordCreateDto) {
    return this.admin.createKeyword(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: KeywordUpdateDto) {
    return this.admin.updateKeyword(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.deleteKeyword(user, id);
  }
}

/** §6.17 user admin: search, provisioning, status, identity conversion. */
@Roles('admin', 'admin_super')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  search(@Query() query: AdminUsersQueryDto) {
    return this.admin.searchUsers(query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.admin.createUser(user, dto);
  }

  @Post('convert')
  batch(@CurrentUser() user: AuthUser, @Body() dto: BatchConvertDto) {
    return this.admin.batchConvert(user, dto);
  }

  @Patch(':id')
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.admin.updateUserStatus(user, id, dto.status);
  }

  @Put(':id')
  updateUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.deleteUser(user, id);
  }

  @Post(':id/convert')
  convert(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ConvertUserDto) {
    return this.admin.convertUser(user, id, dto);
  }
}

/** §6.15/§6.17 admin feedback triage — reply and lifecycle transitions. */
@Roles('admin', 'admin_super')
@Controller('admin/feedback')
export class AdminFeedbackController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  queue(@Query() query: AdminFeedbackQueryDto) {
    return this.admin.feedbackQueue(query);
  }

  @Patch(':id')
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReplyFeedbackDto) {
    return this.admin.replyFeedback(user, id, dto);
  }
}

/** §6.17 role-strategy flags — admin_super only. */
@Roles('admin_super')
@Controller('admin/role-strategies')
export class AdminRoleStrategiesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listRoleStrategies();
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: RoleStrategyUpdateDto) {
    return this.admin.updateRoleStrategy(user, dto);
  }
}

/** §6.17 admin audit trail. */
@Roles('admin', 'admin_super')
@Controller('admin/operation-logs')
export class AdminOperationLogsController {
  constructor(private readonly logs: OperationLogService) {}

  @Get()
  list(@Query() query: PageQuery) {
    return this.logs.list(query);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser) {
    return this.logs.clear(user.id);
  }
}
