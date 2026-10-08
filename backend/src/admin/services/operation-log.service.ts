import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from '../../entities';
import { PageQuery } from '../../common/dto/query.dto';
import { offsetPage } from '../../common/pagination/page';

/**
 * §6.12 operation_logs — the append-only admin audit trail. Every mutating
 * admin action writes one row here (never passwords/tokens in `detail`).
 */
@Injectable()
export class OperationLogService {
  constructor(@InjectRepository(OperationLog) private readonly repo: Repository<OperationLog>) {}

  async log(input: {
    adminId: string;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    detail?: Record<string, unknown> | null;
    ip?: string | null;
  }): Promise<OperationLog> {
    return this.repo.save(
      this.repo.create({
        admin_id: input.adminId,
        action: input.action,
        target_type: input.targetType ?? null,
        target_id: input.targetId ? String(input.targetId) : null,
        detail: input.detail ?? null,
        ip: input.ip ?? null,
      }),
    );
  }

  async list(query: PageQuery) {
    const [rows, total] = await this.repo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.admin', 'admin')
      .orderBy('l.created_at', 'DESC')
      .take(query.limit)
      .skip(query.offset())
      .getManyAndCount();
    return offsetPage(rows.map((l) => this.view(l)), query.page, query.limit, total);
  }

  /**
   * Empties the audit trail. Because the log is append-only (a governance
   * record), the clear itself is recorded as a fresh `operation_log.clear` row
   * right after the delete, so the destructive action is always attributable.
   */
  async clear(adminId: string): Promise<{ deleted: number }> {
    const result = await this.repo.createQueryBuilder('l').delete().execute();
    const deleted = result.affected ?? 0;
    await this.log({ adminId, action: 'operation_log.clear', detail: { deleted } });
    return { deleted };
  }

  private view(l: OperationLog) {
    return {
      id: l.id,
      admin: l.admin ? { id: l.admin.id, name: l.admin.name, role: l.admin.role } : { id: l.admin_id },
      action: l.action,
      target_type: l.target_type,
      target_id: l.target_id,
      detail: l.detail,
      ip: l.ip,
      created_at: l.created_at,
    };
  }
}
