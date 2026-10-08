import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { AlumniService } from '../services/alumni.service';
import { AuthUser, CurrentUser, Idempotent, RequiresStrategy, RequiresVerified } from '../../common/decorators';
import { ApiException } from '../../common/error/api.exception';
import {
  AlumniQueryDto, CreateAlumniProfileDto, SkillsDto, UpdateAlumniProfileDto, VisibilityRequestDto,
} from '../dto/alumni.dto';

/** §6.5 public alumni directory browse + detail. */
@Controller('alumni')
export class AlumniController {
  constructor(private readonly alumni: AlumniService) {}

  @RequiresStrategy('can_view_alumni')
  @Get()
  browse(@CurrentUser() user: AuthUser, @Query() query: AlumniQueryDto) {
    return this.alumni.browse(user, query);
  }

  @RequiresStrategy('can_view_alumni')
  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.alumni.detail(user, id);
  }

  @RequiresStrategy('can_view_alumni')
  @Get(':id/connections')
  connections(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.alumni.connectionsFor(user, id);
  }
}

/** §6.5 the caller's own alumni profile (create / edit / skills / visibility). */
@Controller('me/alumni-profile')
export class MyAlumniProfileController {
  constructor(private readonly alumni: AlumniService) {}

  @Get()
  own(@CurrentUser() user: AuthUser) {
    return this.alumni.own(user).then((p) => {
      if (!p) throw ApiException.notFound('You do not have an alumni profile yet');
      return p;
    });
  }

  @RequiresVerified()
  @RequiresStrategy('can_create_profile')
  @Idempotent()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAlumniProfileDto) {
    return this.alumni.create(user, dto);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAlumniProfileDto,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.alumni.update(user, dto, ifMatch);
  }

  @Put('skills')
  skills(@CurrentUser() user: AuthUser, @Body() dto: SkillsDto) {
    return this.alumni.setSkills(user, dto.skills);
  }

  @Post('visibility-request')
  visibilityRequest(@CurrentUser() user: AuthUser, @Body() dto: VisibilityRequestDto) {
    return this.alumni.requestVisibility(user, dto);
  }
}
