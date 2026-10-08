import { Transform, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { SortQuery } from '../../common/dto/query.dto';

/** §6.7 `POST /posts`. `tags` are names or slugs; upserted against `tags`. */
export class CreatePostDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200)
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50000)
  content!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/** §6.7 `PATCH /posts/:id` — author edit (version-checked §2). */
export class UpdatePostDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50000)
  content?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  version?: number;
}

/** §6.7 `GET /posts` — cursor feed, filter by tag slug + keyword search. */
export class PostQueryDto extends SortQuery {
  @IsOptional()
  @IsString()
  tag?: string;
}

/** §6.7 `POST /posts/:id/comments` — one nesting level via `parent_id`. */
export class CreateCommentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 5000)
  content!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  parent_id?: string;
}

/** §6.7 `PATCH /comments/:id`. */
export class UpdateCommentDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 5000)
  content?: string;

  @IsOptional()
  @Type(() => Number)
  version?: number;
}
