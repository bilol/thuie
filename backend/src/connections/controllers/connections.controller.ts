import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ConnectionsService } from '../services/connections.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { ConnectionQueryDto, CreateConnectionDto, RespondConnectionDto, BlockDto } from '../dto/connection.dto';

/** §6.9 connections: list by box, send a request, respond to one. */
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ConnectionQueryDto) {
    return this.connections.list(user.id, { box: query.box, cursor: query.cursor, limit: query.limit });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConnectionDto) {
    return this.connections.create(user.id, { to_user_id: dto.to_user_id, message: dto.message });
  }

  @Patch(':id')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RespondConnectionDto) {
    return this.connections.respond(user.id, id, dto.status);
  }
}

/** §6.9 blocks — under the caller-scoped `/me` prefix (shares it with MeController). */
@Controller('me/blocks')
export class BlocksController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.connections.listBlocks(user.id);
  }

  @Post()
  block(@CurrentUser() user: AuthUser, @Body() dto: BlockDto) {
    return this.connections.block(user.id, dto.user_id);
  }

  @Delete(':userId')
  unblock(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.connections.unblock(user.id, userId);
  }
}
