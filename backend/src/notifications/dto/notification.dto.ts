import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';

/** §6.13 feed filter — `?unread=true` narrows to `read_at IS NULL`. */
export class NotificationQueryDto extends CursorQuery {
  @IsOptional()
  @Type(() => Boolean)
  @IsIn([true, false])
  unread?: boolean;
}
