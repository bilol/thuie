import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { CursorQuery } from '../../common/dto/query.dto';

export type SearchType = 'all' | 'info' | 'post' | 'profile' | 'event' | 'faculty';
export type SuggestScope = 'all' | 'tags' | 'skills' | 'departments' | 'users';

/** §6.14 `GET /search`. */
export class SearchQueryDto extends CursorQuery {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  q!: string;

  @IsOptional()
  @IsIn(['all', 'info', 'post', 'profile', 'event', 'faculty'])
  type?: SearchType;
}

/** §6.14 `GET /search/suggest`. */
export class SuggestQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 60)
  q!: string;

  @IsOptional()
  @IsIn(['all', 'tags', 'skills', 'departments', 'users'])
  scope?: SuggestScope;
}
