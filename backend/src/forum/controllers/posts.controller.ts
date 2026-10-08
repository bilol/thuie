import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { PostsService } from '../services/posts.service';
import { CommentsService } from '../services/comments.service';
import { CurrentUser, AuthUser, Idempotent, RateLimit, RequiresStrategy, RequiresVerified } from '../../common/decorators';
import { ApiException } from '../../common/error/api.exception';
import { CreateCommentDto, CreatePostDto, PostQueryDto, UpdatePostDto } from '../dto/post.dto';

/** §6.7 forum threads + their comment entry points (`/posts/:id/comments`). */
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService, private readonly comments: CommentsService) {}

  @Get()
  feed(@CurrentUser() user: AuthUser, @Query() query: PostQueryDto) {
    return this.posts.feed(user, query);
  }

  @RequiresVerified()
  @RequiresStrategy('can_post_forum')
  @Idempotent()
  @RateLimit({ scope: 'post.create', limit: 20, windowSec: 3600, by: 'user' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user, dto);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.posts.update(user, id, dto, ifMatch);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.remove(user, id);
  }

  @Post(':id/like')
  like(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.like(user, id);
  }

  @Post(':id/bookmark')
  bookmark(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.bookmark(user, id);
  }

  @Get(':id/comments')
  thread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.comments.thread(id, user);
  }

  @RequiresVerified()
  @RequiresStrategy('can_comment')
  @Post(':id/comments')
  comment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    return this.comments.create(id, user, dto);
  }

  @Post(':id/report')
  report(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    const reason = body?.reason?.trim();
    if (!reason) throw ApiException.validationFailed([{ field: 'reason', message: 'required' }]);
    return this.posts.report(user, id, reason);
  }
}
