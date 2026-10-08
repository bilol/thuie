import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T\s].*)?$/;

/** §6.8 `POST /conversations` — DM (participant_id) or group (participant_ids). */
export class CreateConversationDto {
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  participant_id?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => String(v)) : value))
  @IsString({ each: true })
  participant_ids?: string[];

  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  /**
   * First message. A DM is only persisted when there is something to say,
   * so `POST /conversations` doubles as "start + send" atomically and never
   * leaves an empty conversation behind. Ignored for group creation.
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 5000)
  content?: string;
}

/** §6.8 `POST /conversations/:id/messages`. */
export class SendMessageDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 5000)
  content!: string;

  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  media_id?: string;
}

/** §6.8 `POST /conversations/:id/read` — set caller's `last_read_at`. */
export class MarkReadDto {
  @IsOptional()
  @Matches(ISO_DATE, { message: 'last_read_at must be an ISO date' })
  last_read_at?: string;
}

/** §6.8 `PATCH /conversations/:id` — caller's participant mute/pin flags. */
export class UpdateConversationDto {
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

/** §6.8 `POST /conversations/:id/participants` — group only. */
export class AddParticipantsDto {
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => String(v)) : value))
  @IsString({ each: true })
  user_ids!: string[];
}

/** §6.8 `GET /conversations/:id/messages` — page-back history, cursor `(id DESC)`. */
export class MessageQueryDto extends CursorQuery {
  @IsOptional()
  @IsIn(['desc', 'asc'])
  order?: 'desc' | 'asc';
}
