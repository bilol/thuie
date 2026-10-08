import { Controller, Get } from '@nestjs/common';
import { DepartmentsService } from '../services/departments.service';
import { Public } from '../../common/decorators';

/** §6.3 — the registry is public (no auth), so it's `@Public()`. */
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Public()
  @Get()
  async list() {
    const rows = await this.departments.list();
    return { data: rows.map((d) => ({ id: d.id, code: d.code, name_zh: d.name_zh, name_en: d.name_en, faculty: d.faculty })) };
  }
}
