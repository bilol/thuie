import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQuery, SortQuery } from '../../common/dto/query.dto';

/** §6.6 `GET /faculty?department=&q=&cursor=&limit=`. Cursor envelope — the same
 *  feed shape mobile consumes and the web directory pages through with "load
 *  more". One endpoint, one envelope (§4); admin tables use `PageQuery` offset. */
export class FacultyQueryDto extends SortQuery {
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  department?: string;
}

/** §6.6 `GET /admin/faculty` — offset pagination for the admin console table,
 *  mirroring `AdminUsersQueryDto` (page/limit + q + whitelisted sort/order). */
export class FacultyAdminQueryDto extends PageQuery {
  @IsOptional()
  @IsString()
  q?: string;

  /** Sortable columns the console exposes; anything else falls back to name. */
  @IsOptional()
  @IsIn(['name', 'title'])
  sort?: 'name' | 'title';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

/** §6.6 `POST /admin/faculty` — admin-maintained, directory-only. */
export class CreateFacultyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  department?: string;

  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(240) research_area?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() avatar_media_id?: string;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(500) avatar_url?: string;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(240) address?: string;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(500) homepage?: string;
}

/** §6.6 `PATCH /admin/faculty/:id`. */
export class UpdateFacultyDto {
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(100) name?: string;
  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() department?: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(240) research_area?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() avatar_media_id?: string;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(500) avatar_url?: string;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(240) address?: string;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(500) homepage?: string;
}
