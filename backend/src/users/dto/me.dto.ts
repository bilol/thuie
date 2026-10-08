import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { NotificationType, Visibility } from '../../common/auth.types';

const VISIBILITIES = ['student_only', 'all', 'admin_only'] as const;

/** §6.2 `PATCH /me` — only these fields are self-editable. */
export class UpdateMeDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(64)
  avatar_media_id?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(9)
  grade_year?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(9)
  graduation_year?: string;

  /** Department is admin-gated for students; graduates may adjust it. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(32)
  department?: string;

  /** Contact channels owned by the account (§6.5): handles + per-field audience. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  wechat?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  whatsapp?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  linkedin?: string;

  @IsOptional() @IsIn(VISIBILITIES) wechat_visibility?: Visibility;
  @IsOptional() @IsIn(VISIBILITIES) whatsapp_visibility?: Visibility;
  @IsOptional() @IsIn(VISIBILITIES) linkedin_visibility?: Visibility;

  /** Per-field publication audience for the account email/phone (§3.1). */
  @IsOptional() @IsIn(VISIBILITIES) email_visibility?: Visibility;
  @IsOptional() @IsIn(VISIBILITIES) phone_visibility?: Visibility;
}

/** §6.5 push token registration/rotation. */
export class PushTokenDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(10, 4096)
  token!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}

/** §6.2 mute toggles. */
export class UpdateNotificationPreferencesDto {
  @IsIn([
    'review_result', 'comment_reply', 'connection', 'system',
    'report_result', 'identity_change', 'broadcast',
  ])
  type!: NotificationType;

  @IsBoolean()
  muted!: boolean;
}

/** §6.2 device session label (login/refresh body). */
export class SessionLabelDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_label?: string;
}

/** Profile completeness hints returned by `GET /me` (§6.2). */
export class MeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  with_completion?: number;
}
