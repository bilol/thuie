import { Body, Controller, Delete, Headers, Param, Patch, Post } from '@nestjs/common';
import { CommentsService } from '../services/comments.service';
import { CurrentUser, AuthUser } from '../../common/decorators';
import { ApiException } from '../../common/error/api.exception';
import { UpdateCommentDto } from '../dto/post.dto';

/** §6.7 comment-level routes (edit / takedown / report) by comment id. */
@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.comments.update(user, id, dto, ifMatch);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.comments.remove(user, id);
  }

  @Post(':id/report')
  report(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    const reason = body?.reason?.trim();
    if (!reason) throw ApiException.validationFailed([{ field: 'reason', message: 'required' }]);
    return this.comments.report(user, id, reason);
  }
}
