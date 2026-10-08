import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';

const RESPONSE_STATUSES = ['accepted', 'declined', 'revoked'] as const;

/** §6.9 `POST /connections` — send a request. */
export class CreateConnectionDto {
  @IsString()
  to_user_id!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  message?: string;
}

/** §6.9 `PATCH /connections/:id` — recipient accepts/declines, either party revokes. */
export class RespondConnectionDto {
  @IsIn(RESPONSE_STATUSES)
  status!: (typeof RESPONSE_STATUSES)[number];
}

/** §6.9 `GET /connections?box=requests|mine` (default = accepted network). */
export class ConnectionQueryDto extends CursorQuery {
  @IsOptional()
  @IsIn(['requests', 'mine', 'accepted'])
  box?: 'requests' | 'mine' | 'accepted';
}

/** §6.9 `POST /me/blocks` — block a user. */
export class BlockDto {
  @IsString()
  user_id!: string;
}
