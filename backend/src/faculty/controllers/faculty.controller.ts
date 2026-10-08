import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FacultyService } from '../services/faculty.service';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { CreateFacultyDto, FacultyAdminQueryDto, FacultyQueryDto, UpdateFacultyDto } from '../dto/faculty.dto';

/** §6.6 public faculty browse. */
@Controller('faculty')
export class FacultyController {
  constructor(private readonly faculty: FacultyService) {}

  @Get()
  browse(@Query() query: FacultyQueryDto) {
    return this.faculty.browse(query);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.faculty.detail(id);
  }
}

/** §6.6 admin CRUD — writes the `updated_by` audit column. */
@Roles('admin', 'admin_super')
@Controller('admin/faculty')
export class FacultyAdminController {
  constructor(private readonly faculty: FacultyService) {}

  @Get()
  list(@Query() query: FacultyAdminQueryDto) {
    return this.faculty.listAdmin(query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFacultyDto) {
    return this.faculty.create(dto, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFacultyDto) {
    return this.faculty.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faculty.remove(id);
  }
}
