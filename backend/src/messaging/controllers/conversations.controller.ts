import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MessagingService } from '../services/messaging.service';
import { AuthUser, CurrentUser, RequiresVerified } from '../../common/decorators';
import {
  AddParticipantsDto,
  CreateConversationDto,
  MarkReadDto,
  MessageQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from '../dto/conversation.dto';

/**
 * §6.8 messaging. `GET /conversations` is the inbox; a DM dedupes on
 * `pair_key`, so POST is idempotent. Read/mute/pin state is per participant.
 */
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  inbox(@CurrentUser() user: AuthUser, @Query() query: MessageQueryDto) {
    return this.messaging.inbox(user, { cursor: query.cursor, limit: query.limit });
  }

  @RequiresVerified()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.messaging.create(user, dto);
  }

  @Get(':id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: MessageQueryDto) {
    return this.messaging.listMessages(user, id, { cursor: query.cursor, limit: query.limit, order: query.order });
  }

  @RequiresVerified()
  @Post(':id/messages')
  send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.messaging.send(user, id, dto);
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('messageId') messageId: string) {
    return this.messaging.deleteMessage(user, id, messageId);
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MarkReadDto) {
    return this.messaging.markRead(user, id, dto.last_read_at);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.messaging.updateConversation(user, id, dto);
  }

  @Post(':id/participants')
  addParticipants(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddParticipantsDto) {
    return this.messaging.addParticipants(user, id, dto.user_ids);
  }

  @Delete(':id/participants/:userId')
  removeParticipant(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    return this.messaging.removeParticipant(user, id, userId);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messaging.leave(user, id);
  }
}
