import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';

/** §6.15 `POST /feedback` — free-text product feedback, opens a thread. */
export class CreateFeedbackDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 2000)
  content!: string;
}

/** §6.15 `GET /me/feedback` — the caller's own threads. */
export class MyFeedbackQueryDto extends CursorQuery {}
