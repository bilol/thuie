import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlumniProfile, Connection, Department, ProfileSkill } from '../entities';
import { ModerationModule } from '../moderation/moderation.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AlumniService } from './services/alumni.service';
import { AlumniController, MyAlumniProfileController } from './controllers/alumni.controller';

/**
 * §6.5 alumni directory. `Connection` is reached directly for the per-profile
 * connections lookup; `User` peers are resolved via `manager.getRepository` in
 * the service, so only the injected repositories are declared here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AlumniProfile, ProfileSkill, Department, Connection]),
    ModerationModule,
    // Presence: the directory view surfaces each owner's live online flag via the
    // gateway's in-memory map (RealtimeGateway.isOnline). Acyclic (Realtime → Users).
    RealtimeModule,
  ],
  controllers: [AlumniController, MyAlumniProfileController],
  providers: [AlumniService],
  exports: [AlumniService],
})
export class AlumniModule {}
