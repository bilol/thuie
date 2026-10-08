import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaObject } from '../entities';
import { MediaService } from './services/media.service';
import { MediaController } from './controllers/media.controller';

/**
 * §8 media & uploads. `MediaService` is exported so content modules can verify
 * `media_id` ownership before linking (post_media / infos / alumni).
 */
@Module({
  imports: [TypeOrmModule.forFeature([MediaObject])],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
