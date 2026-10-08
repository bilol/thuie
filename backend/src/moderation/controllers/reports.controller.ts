import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ReportService } from '../services/report.service';
import { CurrentUser, AuthUser, RequiresVerified, RateLimit, Idempotent } from '../../common/decorators';
import { CreateReportDto, ReportQueryDto } from '../dto/moderation.dto';

/**
 * §6.12 the generic report surface. Per-target aliases (`POST /infos/:id/report`,
 * …) reuse `ReportService.create` with a fixed `target_type`; this controller is
 * the single canonical endpoint. Filing requires a verified account (§3.2).
 */
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportService) {}

  @RequiresVerified()
  @HttpCode(201)
  @Idempotent()
  @RateLimit({ scope: 'report.create', limit: 20, windowSec: 3600, by: 'user' })
  @Post('reports')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.reports.create(user.id, dto);
  }

  @Get('me/reports')
  mine(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    return this.reports.mine(user.id, { cursor: query.cursor, limit: query.limit });
  }
}
