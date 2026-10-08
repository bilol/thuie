import { IsIn, IsOptional, IsString } from 'class-validator';
import { TargetType } from '../../common/auth.types';
import { CursorQuery } from '../../common/dto/query.dto';

const TARGET_TYPES: TargetType[] = ['info', 'profile', 'post', 'comment'];

/** §6.12 `POST`/`DELETE /favorites` — the (target_type, target_id) triple. */
export class FavoriteDto {
  @IsIn(TARGET_TYPES)
  target_type!: TargetType;

  @IsString()
  target_id!: string;
}

/** §6.12 `GET /favorites?type=` — cursor feed, optional type filter. */
export class FavoriteQueryDto extends CursorQuery {
  @IsOptional()
  @IsIn(TARGET_TYPES)
  type?: TargetType;
}

/**
 * §6.12 `GET /favorites/status?type=&id=` — the single-target existence probe
 * behind every save/favorite icon. Both keys are required, so a partial probe
 * fails validation (§2) rather than silently answering "not saved".
 */
export class FavoriteStatusQueryDto {
  @IsIn(TARGET_TYPES)
  type!: TargetType;

  @IsString()
  id!: string;
}
