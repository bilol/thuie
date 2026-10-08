import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { ReportStatus, ReportTargetType } from '../../common/auth.types';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { serializeUserBrief } from '../../common/serializers/user.serializer';
import { NotificationService } from '../../notifications/services/notification.service';

const OUTCOME_STATUS: Record<'ignored' | 'deleted' | 'restricted', ReportStatus> = {
  ignored: 'resolved_ignored',
  deleted: 'resolved_deleted',
  restricted: 'resolved_restricted',
};

/**
 * §6.12 reports — the user-raised queue feeding §6.17 admin resolution. A
 * reporter may hold only ONE open report per target (partial-unique intent), so
 * a re-file while one is open is a conflict rather than a duplicate row.
 */
@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report) private readonly repo: Repository<Report>,
    private readonly notifications: NotificationService,
  ) {}

  async create(reporterId: string, input: { target_type: ReportTargetType; target_id: string; reason: string }) {
    const open = await this.repo.findOne({
      where: { reporter_id: reporterId, target_type: input.target_type, target_id: input.target_id, status: 'open' },
    });
    if (open) throw ApiException.conflict('You already have an open report for this item', 'already_reported', { report_id: open.id });
    const row = await this.repo.save(this.repo.create({ reporter_id: reporterId, ...input, status: 'open' }));
    return this.view(row);
  }

  async mine(reporterId: string, query: { cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.repo.createQueryBuilder('r').where('r.reporter_id = :id', { id: reporterId });
    if (cursor?.v) qb.andWhere('r.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb.orderBy('r.created_at', 'DESC').addOrderBy('r.id', 'DESC').take(limit + 1).getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.created_at.toISOString(), id: last.id }) : null;
    return cursorPage(rows.slice(0, limit).map((r) => this.view(r)), limit, next);
  }

  /**
   * §6.17 admin resolve: flip status + note, then notify the reporter
   * (`report_result`). Called by the admin tranche's `POST /admin/reports/:id/resolve`.
   */
  async resolve(reportId: string, actorId: string, outcome: 'ignored' | 'deleted' | 'restricted', note?: string) {
    const row = await this.repo.findOne({ where: { id: reportId } });
    if (!row) throw ApiException.notFound('Report not found');
    if (row.status !== 'open') throw ApiException.conflict('Report already resolved', 'already_resolved');
    row.status = OUTCOME_STATUS[outcome];
    row.result_note = note ?? null;
    row.resolved_by = actorId;
    row.resolved_at = new Date();
    await this.repo.save(row);
    await this.notifications.notify({
      recipientId: row.reporter_id,
      type: 'report_result',
      title: 'Your report was reviewed',
      body: note ?? `Outcome: ${outcome}.`,
      payload: { targetType: 'report', targetId: row.id },
    });
    return this.view(row);
  }

  /** §6.17 admin queue — offset list of open/all reports, with the reporter. */
  async queue(filter: { status?: ReportStatus }, take: number, skip: number) {
    const qb = this.repo.createQueryBuilder('r').leftJoinAndSelect('r.reporter', 'reporter');
    if (filter.status) qb.andWhere('r.status = :status', { status: filter.status });
    const [rows, total] = await qb.orderBy('r.created_at', 'ASC').skip(skip).take(take).getManyAndCount();
    return { rows: rows.map((r) => this.adminView(r)), total };
  }

  private view(r: Report) {
    return {
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      reason: r.reason,
      status: r.status,
      result_note: r.result_note,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
    };
  }

  /** Admin-queue row: the base view plus who raised the report (nested brief). */
  private adminView(r: Report) {
    return {
      ...this.view(r),
      reporter_id: r.reporter_id,
      reporter: r.reporter ? serializeUserBrief(r.reporter) : null,
    };
  }
}
