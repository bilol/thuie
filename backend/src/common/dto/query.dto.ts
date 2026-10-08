import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { clampLimit } from '../pagination/cursor';

/**
 * Shared query-param DTOs (§4). Two pagination flavours:
 *   CursorQuery — feed-style collections (data + meta.nextCursor)
 *   PageQuery   — admin tables (page/limit + total metadata)
 * Both extend FilterQuery-ish usage via controller-specific subclasses.
 */
export class CursorQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limitRaw?: number;

  /** Clamped to [1,50]; out-of-range values are silently reduced (§4). */
  get limit(): number {
    return clampLimit(this.limitRaw);
  }

  /**
   * Required alongside the getter: ValidationPipe's plainToInstance assigns
   * every incoming `?limit=` key directly, and a getter-only property throws
   * (TypeError → 500). Route the raw value into `limitRaw` instead.
   */
  set limit(value: number | string) {
    this.limitRaw = Number(value);
  }
}

export class PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limitRaw?: number;

  get limit(): number {
    return clampLimit(this.limitRaw);
  }

  /** See CursorQuery.limit — plainToInstance needs a setter. */
  set limit(value: number | string) {
    this.limitRaw = Number(value);
  }

  offset(): number {
    return (this.page - 1) * this.limit;
  }
}

/** Sort/order helper used by feeds: ?sort=latest|hot&order=asc|desc. */
export class SortQuery extends CursorQuery {
  @IsOptional()
  @IsString()
  sort?: string;

  /** Free-form keyword search scoped to the collection (§7.13). */
  @IsOptional()
  @IsString()
  q?: string;
}

/** Optional `view=all` override for admin endpoints on status-filtered lists. */
export class StatusFilterQuery extends SortQuery {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  version?: number;
}
