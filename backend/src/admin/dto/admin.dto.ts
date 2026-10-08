import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, Matches, ValidateNested,
} from 'class-validator';
import { PageQuery } from '../../common/dto/query.dto';
import { PASSWORD_RULE } from '../../auth/dto/auth.dto';
import { KeywordAction, ModerationTargetType, ReportStatus, Role, UserStatus } from '../../common/auth.types';

const MOD_TYPES: ModerationTargetType[] = ['info_post', 'forum_post', 'comment', 'alumni_profile'];

/** §6.17 `GET /admin/review`. */
export class ReviewQueueQueryDto extends PageQuery {
  @IsOptional()
  @IsIn(MOD_TYPES)
  type?: ModerationTargetType;
}

/** §6.17 `POST /admin/review/{type}/{id}/reject` and `/admin/takedown`. */
export class RejectDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}

export class TakedownDto extends RejectDto {
  @IsIn(MOD_TYPES)
  target_type!: ModerationTargetType;

  @IsString()
  target_id!: string;
}

/** §6.17 `GET /admin/reports`. */
export class ReportsQueryDto extends PageQuery {
  @IsOptional()
  @IsIn(['open', 'resolved_ignored', 'resolved_deleted', 'resolved_restricted'])
  status?: ReportStatus;
}

/** §6.17 `POST /admin/reports/:id/resolve`. */
export class ResolveReportDto {
  @IsIn(['ignored', 'deleted', 'restricted'])
  outcome!: 'ignored' | 'deleted' | 'restricted';

  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}

/** §6.15/§6.17 `GET /admin/feedback` — admin triage queue. */
export class AdminFeedbackQueryDto extends PageQuery {
  @IsOptional()
  @IsIn(['open', 'answered', 'closed'])
  status?: 'open' | 'answered' | 'closed';
}

/** §6.17 `PATCH /admin/feedback/:id` — post a reply and/or move the thread. */
export class ReplyFeedbackDto {
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  reply?: string;

  @IsOptional()
  @IsIn(['open', 'answered', 'closed'])
  status?: 'open' | 'answered' | 'closed';
}

/** §6.17 keyword create/update. */
export class KeywordCreateDto {
  @IsString()
  @Length(1, 100)
  word!: string;

  @IsIn(['block', 'manual_review'])
  action!: KeywordAction;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class KeywordUpdateDto {
  @IsOptional()
  @IsIn(['block', 'manual_review'])
  action?: KeywordAction;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** §6.17 `GET /admin/users`. */
export class AdminUsersQueryDto extends PageQuery {
  @IsOptional()
  @IsIn(['student', 'graduate', 'admin', 'admin_super'])
  role?: Role;

  @IsOptional()
  @IsIn(['unverified', 'active', 'posting_restricted', 'banned', 'deleted'])
  status?: UserStatus;

  @IsOptional()
  @IsString()
  q?: string;

  /** Program code (MEM / IMEM / GMA) — exact, case-insensitive, on the user row. */
  @IsOptional()
  @IsString()
  @Length(1, 120)
  program?: string;

  /** Nationality ISO code (CN / US / …) — exact, case-insensitive, on the user row. */
  @IsOptional()
  @IsString()
  @Length(1, 120)
  nationality?: string;

  /** Column-header sort field (§6.17) — server-side, whitelisted in the service. */
  @IsOptional()
  @IsIn(['name', 'program', 'department', 'role', 'status', 'created_at'])
  sort?: 'name' | 'program' | 'department' | 'role' | 'status' | 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

/** §6.17 `PATCH /admin/users/:id` — restrict / ban / restore. */
export class UpdateUserStatusDto {
  @IsIn(['unverified', 'active', 'posting_restricted', 'banned', 'deleted'])
  status!: UserStatus;
}

/** §6.17 `PUT /admin/users/:id` — edit a user's profile details. */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  student_id?: string | null;

  @IsOptional()
  @IsString()
  department_id?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  program?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  nationality?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 9)
  grade_year?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 9)
  graduation_year?: string | null;

  @IsOptional()
  @IsIn(['student', 'graduate', 'admin', 'admin_super'])
  role?: Role;
}

/**
 * §6.17 `POST /admin/users` — admin-provisioned account. Creation is normally
 * self-service behind an OTP (§6.2); this is the governed exception (onboarding
 * staff, pre-registered people), so the admin supplies a temporary password and
 * the account starts `active`. Handle rules mirror `RegisterDto` because they are
 * DB CHECKs: one of student_id/phone/email, and student_id for a student role.
 */
export class CreateUserDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsIn(['student', 'graduate', 'admin', 'admin_super'])
  role!: Role;

  @Matches(PASSWORD_RULE, {
    message: 'password must be 8-64 characters and contain at least one letter and one digit',
  })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  student_id?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  program?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  nationality?: string;

  @IsOptional()
  @IsString()
  @Length(0, 9)
  grade_year?: string;

  @IsOptional()
  @IsString()
  @Length(0, 9)
  graduation_year?: string;
}

/** §6.17 role-strategy flags patch (admin_super). */
export class RoleStrategyUpdateDto {
  @IsIn(['student', 'graduate', 'admin', 'admin_super'])
  role!: Role;

  @IsOptional() @IsBoolean() can_view_info?: boolean;
  @IsOptional() @IsBoolean() can_view_internal?: boolean;
  @IsOptional() @IsBoolean() can_view_alumni?: boolean;
  @IsOptional() @IsBoolean() can_view_forum?: boolean;
  @IsOptional() @IsBoolean() can_submit_info?: boolean;
  @IsOptional() @IsBoolean() can_post_forum?: boolean;
  @IsOptional() @IsBoolean() can_comment?: boolean;
  @IsOptional() @IsBoolean() can_create_profile?: boolean;
}

/** §6.17 identity conversion (student → graduate). */
export class ConvertUserDto {
  @IsOptional()
  @IsString()
  @Length(4, 4)
  graduation_year?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class ConvertItem {
  @IsString()
  user_id!: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  graduation_year?: string;
}

export class BatchConvertDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertItem)
  items!: ConvertItem[];
}
