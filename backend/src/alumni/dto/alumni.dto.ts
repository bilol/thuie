import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { SortQuery } from '../../common/dto/query.dto';

const VISIBILITIES = ['student_only', 'all', 'admin_only'] as const;

/** Shared text fields for §6.5 create/edit (edit is the same minus requireds). */
class AlumniFieldsDto {
  /** Department code or id. */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  department?: string;

  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() @MaxLength(9) graduation_year?: string;
  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() @MaxLength(9) grade_year?: string;
  @IsOptional() @IsIn(['MEM', 'IMEM', 'GMA']) program?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) nationality?: string;
  @IsOptional() @IsString() @MaxLength(160) work_title?: string;
  @IsOptional() @IsString() @MaxLength(160) company?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @Transform(({ value }) => (value == null ? value : String(value))) @IsString() avatar_media_id?: string;
  @IsOptional() @IsIn(VISIBILITIES) visibility?: (typeof VISIBILITIES)[number];
}

/** §6.5 `POST /me/alumni-profile`. */
export class CreateAlumniProfileDto extends AlumniFieldsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  display_name!: string;
}

/** §6.5 `PATCH /me/alumni-profile` — version-checked (§2). */
export class UpdateAlumniProfileDto extends AlumniFieldsDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  display_name?: string;

  @IsOptional()
  @Type(() => Number)
  version?: number;
}

/** §6.5 `PUT /me/alumni-profile/skills` — idempotent full replacement. */
export class SkillsDto {
  @IsArray()
  @IsString({ each: true })
  skills!: string[];
}

/** §6.5 `POST /me/alumni-profile/visibility-request` — resubmit visibility for review. */
export class VisibilityRequestDto {
  @IsOptional() @IsIn(VISIBILITIES) visibility?: (typeof VISIBILITIES)[number];
}

/** §6.5 `GET /alumni` browse. */
export class AlumniQueryDto extends SortQuery {
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  @MaxLength(9)
  graduation_year?: string;

  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  @MaxLength(160)
  company?: string;

  /** Program code (e.g. MEM / IMEM / GMA). Exact, case-insensitive match —
   *  never a substring test, because 'MEM' is contained in 'IMEM'. */
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  @MaxLength(120)
  program?: string;

  /** Free-text country; partial match (international cohort). */
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  @MaxLength(120)
  country?: string;
}
