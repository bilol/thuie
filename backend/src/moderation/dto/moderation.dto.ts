import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';
import { ReportTargetType } from '../../common/auth.types';

const REPORT_TARGETS: ReportTargetType[] = ['info_post', 'forum_post', 'comment', 'alumni_profile', 'user'];

/** §6.12 `POST /reports` — generic polymorphic report. */
export class CreateReportDto {
  @IsIn(REPORT_TARGETS)
  target_type!: ReportTargetType;

  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  target_id!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 500)
  reason!: string;
}

/** §6.12 `GET /me/reports` — caller's filed reports, cursor-paginated. */
export class ReportQueryDto extends CursorQuery {}
