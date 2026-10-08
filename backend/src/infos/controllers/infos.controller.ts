import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { InfosService } from '../services/infos.service';
import { CurrentUser, AuthUser, Idempotent, RateLimit, RequiresStrategy, RequiresVerified } from '../../common/decorators';
import { ApiException } from '../../common/error/api.exception';
import { CreateInfoDto, InfoQueryDto, UpdateInfoDto } from '../dto/info.dto';

/**
 * §6.4 information board routes. The whole surface sits behind the global
 * JWT guard (infos are not in the §3 public list); visibility/status filtering
 * is applied in {@link InfosService}, not here.
 */
@Controller('infos')
export class InfosController {
  constructor(private readonly infos: InfosService) {}

  @Get()
  feed(@CurrentUser() user: AuthUser, @Query() query: InfoQueryDto) {
    return this.infos.feed(user, query);
  }

  @RequiresVerified()
  @RequiresStrategy('can_submit_info')
  @Idempotent()
  @RateLimit({ scope: 'info.create', limit: 20, windowSec: 3600, by: 'user' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInfoDto) {
    return this.infos.create(user, dto);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.infos.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInfoDto,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.infos.update(user, id, dto, ifMatch);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.infos.remove(user, id);
  }

  /** Convenience alias for `POST /reports` with a fixed target_type (§6.4). */
  @RequiresVerified()
  @Post(':id/report')
  report(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    const reason = body?.reason?.trim();
    if (!reason) throw ApiException.validationFailed([{ field: 'reason', message: 'required' }]);
    return this.infos.report(user, id, reason);
  }
}
