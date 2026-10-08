import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { SearchQueryDto, SuggestQueryDto } from '../dto/search.dto';

/** §6.14 search + autocomplete. Both are authenticated (visibility-scoped). */
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('suggest')
  suggest(@Query() query: SuggestQueryDto) {
    return this.search.suggest(query);
  }

  @Get()
  run(@CurrentUser() user: AuthUser, @Query() query: SearchQueryDto) {
    return this.search.search(user, { q: query.q, type: query.type, limit: query.limit });
  }
}
