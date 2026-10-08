import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampusEvent, EventRegistration } from '../entities';
import { EventsService } from './services/events.service';
import { EventsController, MyEventRegistrationsController } from './controllers/events.controller';

/** §6.10 campus events + registrations + signed single-use tickets. */
@Module({
  imports: [TypeOrmModule.forFeature([CampusEvent, EventRegistration])],
  controllers: [EventsController, MyEventRegistrationsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
