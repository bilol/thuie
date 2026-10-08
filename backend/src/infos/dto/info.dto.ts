import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { SortQuery } from '../../common/dto/query.dto';

const CATEGORIES = ['internal', 'open', 'recruitment'] as const;
const SOURCES = ['official', 'user'] as const;
const VISIBILITIES = ['student_only', 'all', 'admin_only'] as const;

/** §6.4 `POST /infos`. */
export class CreateInfoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200)
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(20000)
  content!: string;

  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: (typeof VISIBILITIES)[number];

  /** Department code or id; admins may target a department, others inherit their own. */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  department?: string;

  /** Admin-only — pinned notices float to the top of the feed (§6.4). */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  pinned?: boolean;
}

/** §6.4 `PATCH /infos/:id` — author edit (version-checked). */
export class UpdateInfoDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: (typeof VISIBILITIES)[number];

  /** Optimistic-lock token (§2): body `version` or the `If-Match` header. */
  @IsOptional()
  @Type(() => Number)
  version?: number;
}

/** §6.4 `GET /infos` — cursor feed with category + source filters. */
export class InfoQueryDto extends SortQuery {
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];

  /** Filter by origin: `official` = platform notices, `user` = submissions. */
  @IsOptional()
  @IsIn(SOURCES)
  source?: (typeof SOURCES)[number];
}
