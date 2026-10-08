import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department, InfoPost } from '../entities';
import { ModerationModule } from '../moderation/moderation.module';
import { InfosService } from './services/infos.service';
import { InfosController } from './controllers/infos.controller';

/** §6.4 information board. */
@Module({
  imports: [TypeOrmModule.forFeature([InfoPost, Department]), ModerationModule],
  controllers: [InfosController],
  providers: [InfosService],
  exports: [InfosService],
})
export class InfosModule {}
