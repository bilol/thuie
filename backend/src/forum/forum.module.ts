import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment, ForumPost, PostTag, Tag } from '../entities';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsService } from './services/posts.service';
import { CommentsService } from './services/comments.service';
import { TagsService } from './services/tags.service';
import { PostsController } from './controllers/posts.controller';
import { CommentsController } from './controllers/comments.controller';
import { TagsController } from './controllers/tags.controller';

/**
 * §6.7 forum. `PostLike` / `PostView` / `Favorite` are reached via
 * `manager.getRepository(...)` inside the toggle transactions, so only the four
 * entities with injected repositories are declared here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ForumPost, Comment, Tag, PostTag]),
    ModerationModule,
    NotificationsModule,
  ],
  controllers: [PostsController, CommentsController, TagsController],
  providers: [PostsService, CommentsService, TagsService],
  exports: [PostsService, CommentsService, TagsService],
})
export class ForumModule {}
