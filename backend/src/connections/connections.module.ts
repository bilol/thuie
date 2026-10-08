import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block, Connection, User } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConnectionsService } from './services/connections.service';
import { BlocksController, ConnectionsController } from './controllers/connections.controller';

/**
 * §6.9 connections + blocks. `ConnectionsService` is exported so messaging can
 * consult {@link ConnectionsService.hasBlocked} before allowing a DM (§6.8).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Connection, Block, User]), NotificationsModule],
  controllers: [ConnectionsController, BlocksController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
