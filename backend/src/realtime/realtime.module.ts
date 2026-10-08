import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationParticipant } from '../entities';
import { UsersModule } from '../users/users.module';
import { RealtimeGateway } from './realtime.gateway';

/**
 * §9 realtime (Socket.IO). `RealtimeGateway` is exported so the messaging and
 * notification write paths can push increments after they persist. TokenService
 * is available globally (AuthCoreModule); membership reads need `User`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ConversationParticipant]), UsersModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
