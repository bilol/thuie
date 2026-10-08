import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { FavoritesService } from '../services/favorites.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { TargetType } from '../../common/auth.types';
import { FavoriteDto, FavoriteQueryDto, FavoriteStatusQueryDto } from '../dto/favorite.dto';

/**
 * §6.12 favorites. Bookmarks are pure engagement state (no moderation, no
 * visibility write), so the whole surface is caller-scoped via `@CurrentUser()`.
 */
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: FavoriteQueryDto) {
    return this.favorites.list(user.id, { type: query.type, cursor: query.cursor, limit: query.limit });
  }

  /**
   * Existence probe for one target — what paints the save/favorite icon as already
   * saved (and lets the button offer the un-save half). Declared before `:type/:id`
   * so the literal path is not swallowed by the parameterised route.
   */
  @Get('status')
  async status(@CurrentUser() user: AuthUser, @Query() query: FavoriteStatusQueryDto) {
    const map = await this.favorites.status(user.id, [{ target_type: query.type, target_id: query.id }]);
    return { favorited: !!map[`${query.type}:${query.id}`] };
  }

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: FavoriteDto) {
    return this.favorites.add(user.id, { target_type: dto.target_type, target_id: dto.target_id });
  }

  /** Body form (mirrors POST) and the `/favorites/:type/:id` alias (§6.12). */
  @Delete()
  remove(@CurrentUser() user: AuthUser, @Body() dto: FavoriteDto) {
    return this.favorites.remove(user.id, { target_type: dto.target_type, target_id: dto.target_id });
  }

  @Delete(':type/:id')
  removeAlias(@CurrentUser() user: AuthUser, @Param('type') type: TargetType, @Param('id') id: string) {
    return this.favorites.remove(user.id, { target_type: type, target_id: id });
  }
}
