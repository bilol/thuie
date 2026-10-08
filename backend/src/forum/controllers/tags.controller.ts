import { Controller, Get } from '@nestjs/common';
import { TagsService } from '../services/tags.service';
import { Public } from '../../common/decorators';

/** §6.7 tag dictionary — public reference for the compose/browse pickers. */
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Public()
  @Get()
  async list() {
    const rows = await this.tags.list();
    return { data: rows.map((t) => ({ id: t.id, name: t.name, slug: t.slug })) };
  }
}
