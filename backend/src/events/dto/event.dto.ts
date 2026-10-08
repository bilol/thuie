import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';

const EVENT_TYPES = ['recruitment', 'lecture', 'sharing', 'ceremony', 'sports', 'other'] as const;
const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'archived'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T\s].*)?$/;

/** §6.10 `GET /events` — filter by type + a `starts_at` lower bound. */
export class EventQueryDto extends CursorQuery {
  @IsOptional() @IsIn(EVENT_TYPES) type?: (typeof EVENT_TYPES)[number];
  @IsOptional() @Matches(ISO_DATE, { message: 'starts_at must be an ISO date' }) starts_at?: string;
  @IsOptional() @IsIn(EVENT_STATUSES) status?: (typeof EVENT_STATUSES)[number];
}

/** §6.10 `POST /events` — admin create. */
export class CreateEventDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200)
  title!: string;

  @Matches(ISO_DATE, { message: 'starts_at must be an ISO date' })
  starts_at!: string;

  @IsOptional() @Matches(ISO_DATE, { message: 'ends_at must be an ISO date' }) ends_at?: string;
  @IsOptional() @IsString() @MaxLength(240) location?: string;
  @IsOptional() @IsString() @MaxLength(200) organizer?: string;
  @IsOptional() @IsIn(EVENT_TYPES) type?: (typeof EVENT_TYPES)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) capacity?: number;
  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() cover_media_id?: string;
  @IsOptional() @IsIn(EVENT_STATUSES) status?: (typeof EVENT_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
}

/** §6.10 `PATCH /events/:id` — admin edit / status. */
export class UpdateEventDto {
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @Length(1, 200) title?: string;
  @IsOptional() @Matches(ISO_DATE) starts_at?: string;
  @IsOptional() @Matches(ISO_DATE) ends_at?: string;
  @IsOptional() @IsString() @MaxLength(240) location?: string;
  @IsOptional() @IsString() @MaxLength(200) organizer?: string;
  @IsOptional() @IsIn(EVENT_TYPES) type?: (typeof EVENT_TYPES)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) capacity?: number;
  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() cover_media_id?: string;
  @IsOptional() @IsIn(EVENT_STATUSES) status?: (typeof EVENT_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
}

/** §6.10 `POST /events/:id/check-in` — organizer submits a scanned ticket. */
export class CheckInDto {
  @IsString()
  ticket!: string;
}
