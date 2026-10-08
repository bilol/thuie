import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlumniProfile, Comment, Favorite, ForumPost, InfoPost } from '../entities';
import { FavoritesService } from './services/favorites.service';
import { TargetMetaService } from './services/target-meta.service';
import { FavoritesController } from './controllers/favorites.controller';

/**
 * §6.12 favorites (bookmarks). `FavoritesService` is exported so feeds can
 * batch-probe bookmark state without re-declaring the repository.
 *
 * The four target entities are registered here (read-only) so `TargetMetaService`
 * can name a saved row — same shape as `admin.module.ts`, which registers all
 * four for its review queue.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Favorite, InfoPost, ForumPost, Comment, AlumniProfile])],
  controllers: [FavoritesController],
  providers: [FavoritesService, TargetMetaService],
  exports: [FavoritesService, TargetMetaService],
})
export class FavoritesModule {}
