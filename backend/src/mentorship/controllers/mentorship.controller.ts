import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { AuthUser, CurrentUser, RequiresVerified } from '../../common/decorators';
import {
  ApplicationQueryDto, CreateApplicationDto, CreateMentorDto, MentorQueryDto, RespondApplicationDto,
} from '../dto/mentorship.dto';

/** §6.11 mentor directory. */
@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Get()
  list(@Query() query: MentorQueryDto) {
    return this.mentorship.listMentors(query);
  }
}

/** §6.11 become a mentor (own profile). */
@Controller('me/mentor-profile')
export class MyMentorProfileController {
  constructor(private readonly mentorship: MentorshipService) {}

  @RequiresVerified()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMentorDto) {
    return this.mentorship.becomeMentor(user, dto);
  }
}

/** §6.11 mentorship applications lifecycle. */
@Controller('mentorship/applications')
export class MentorshipApplicationsController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ApplicationQueryDto) {
    return this.mentorship.listApplications(user, { role: query.role, status: query.status, cursor: query.cursor, limit: query.limit });
  }

  @RequiresVerified()
  @Post()
  apply(@CurrentUser() user: AuthUser, @Body() dto: CreateApplicationDto) {
    return this.mentorship.apply(user, { mentor_user_id: dto.mentor_user_id, message: dto.message });
  }

  @Patch(':id')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RespondApplicationDto) {
    return this.mentorship.respond(user, id, dto.status);
  }

  @Delete(':id')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mentorship.withdrawOrEnd(user, id);
  }
}
