import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage, Conversation, ConversationParticipant, User } from '../entities';
import { ConnectionsModule } from '../connections/connections.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MessagingService } from './services/messaging.service';
import { ConversationsController } from './controllers/conversations.controller';

/** §6.8 messaging (conversations + messages, block-aware DMs). */
@Module({
  imports: [TypeOrmModule.forFeature([Conversation, ConversationParticipant, ChatMessage, User]), ConnectionsModule, RealtimeModule],
  controllers: [ConversationsController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
