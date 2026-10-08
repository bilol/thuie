import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';

/** §6.11 `GET /mentors?area=`. */
export class MentorQueryDto extends CursorQuery {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  area?: string;
}

/** §6.11 `POST /me/mentor-profile`. */
export class CreateMentorDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 500)
  expertise!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mentor_area?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  max_mentees?: number;
}

/** §6.11 `POST /mentorship/applications`. */
export class CreateApplicationDto {
  @IsString()
  mentor_user_id!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  message?: string;
}

/** §6.11 `PATCH /mentorship/applications/:id` — mentor accept/reject. */
export class RespondApplicationDto {
  @IsIn(['accepted', 'rejected'])
  status!: 'accepted' | 'rejected';
}

/** §6.11 `GET /mentorship/applications?role=incoming|outgoing`. */
export class ApplicationQueryDto extends CursorQuery {
  @IsOptional()
  @IsIn(['incoming', 'outgoing'])
  role?: 'incoming' | 'outgoing';

  @IsOptional()
  @IsIn(['pending', 'accepted', 'rejected', 'withdrawn', 'ended'])
  status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'ended';
}
