import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { MediaKind } from '../../common/auth.types';

/**
 * §8.1 `POST /media` — the upload request (metadata only). Bytes follow via
 * `PUT /media/:id/content` (local fallback for the S3 presigned PUT). Kind/size
 * policy (§8.2) is enforced in {@link MediaService}, not here, so the wire
 * contract stays permissive and errors render as `validation_failed`.
 */
export class MediaRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['image', 'avatar', 'attachment'])
  kind!: MediaKind;

  @IsString()
  @Length(1, 255)
  file_name!: string;

  @IsString()
  @Length(1, 100)
  mime_type!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size_bytes!: number;

  @IsOptional()
  @Matches(/^[0-9a-f]{64}$/i, { message: 'sha256 must be a 64-char hex digest' })
  sha256?: string;
}
