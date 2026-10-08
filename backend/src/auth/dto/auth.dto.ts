import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { OtpPurpose } from '../../common/auth.types';

/**
 * BACKEND.md §3 request bodies. Validation failure is a 422 `validation_failed`
 * with `errors[]` (see AllExceptionsFilter), never a stack trace.
 */

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class LoginDto {
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  handle!: string; // student_id | phone | email

  @IsString()
  @Length(1, 128)
  password!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  device_label?: string;
}

export class RefreshDto {
  @IsString()
  @Length(20, 200)
  refresh_token!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  device_label?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;

  /** true ⇒ revoke the whole device family, not just this token. */
  @IsOptional()
  all_devices?: boolean;
}

/**
 * Password policy (PROJECT §6.5): ≥8 chars, at least one letter and one digit.
 * Enforced here and mirrored client-side.
 */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsIn(['student', 'graduate'])
  role!: 'student' | 'graduate';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  student_id?: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/^\+?\d{7,20}$/, { message: 'phone must be digits, optional leading +' })
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  email?: string;

  @Matches(PASSWORD_RULE, {
    message: 'password must be 8-64 characters and contain at least one letter and one digit',
  })
  password!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  department?: string; // code or id, resolved in the service

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(9)
  grade_year?: string;

  /** OTP issued by the same call when no code is supplied yet (§3.2). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(4, 10)
  otp_code?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(4, 10)
  invite_code?: string;
}

export class VerifyDto {
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  identifier!: string; // the phone/email that received the code

  @IsIn(['register_verify', 'password_reset'])
  purpose!: OtpPurpose;

  @Transform(trim)
  @IsString()
  @Length(4, 10)
  code!: string;
}

export class ResendDto {
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  identifier!: string;

  @IsIn(['register_verify', 'password_reset'])
  purpose!: OtpPurpose;
}

export class ForgotPasswordDto {
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  identifier!: string;
}

export class ResetPasswordDto {
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  identifier!: string;

  @Transform(trim)
  @IsString()
  @Length(4, 10)
  code!: string;

  @Matches(PASSWORD_RULE, {
    message: 'password must be 8-64 characters and contain at least one letter and one digit',
  })
  new_password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, 128)
  current_password!: string;

  @Matches(PASSWORD_RULE, {
    message: 'new_password must be 8-64 characters and contain at least one letter and one digit',
  })
  new_password!: string;
}
