import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../../entities';
import { NotificationType } from '../../common/auth.types';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

/**
 * §6.12 / §6.13 notifications — the single write path every other feature uses
 * to raise an inbox row (review results, comment replies, connections, …).
 * Creating the row is unconditional: `notification-preferences` mutes (§6.2)
 * only gate the WS + FCM fan-out (Phase 2, §9.1), never persistence.
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Raise one inbox row. `payload` is the shared deep-link (§9): {route,targetType,targetId}. */
  async notify(input: {
    recipientId: string;
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown> | null;
  }): Promise<Notification> {
    const row = await this.repo.save(
      this.repo.create({
        recipient_id: input.recipientId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload ?? null,
      }),
    );
    // §9.1 WS-first push (row persistence is unconditional; this only notifies).
    this.realtime.emitNotification(row.recipient_id, row);
    return row;
  }

  /** Fire-and-collect bulk fan-out (broadcast / batch moderation results). */
  async notifyMany(recipientIds: string[], same: Omit<Parameters<NotificationService['notify']>[0], 'recipientId'>) {
    return Promise.all(recipientIds.map((recipientId) => this.notify({ recipientId, ...same })));
  }

  /**
   * §6.13 inbox, unread-first then newest. Keyset cursor over the composite
   * sort (is_unread, created_at, id) using a Postgres row-value comparison, so
   * paging stays stable even as rows get read underneath the client.
   */
  async list(userId: string, query: { cursor?: string; limit?: number; unread?: boolean }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.repo.createQueryBuilder('n').where('n.recipient_id = :userId', { userId });
    if (query.unread) qb.andWhere('n.read_at IS NULL');

    if (cursor && cursor.v != null) {
      qb.andWhere(
        `(CASE WHEN n.read_at IS NULL THEN 1 ELSE 0 END, n.created_at, n.id) < (:cu, :cv, :cid)`,
        { cu: Number(cursor.u ?? 0), cv: new Date(String(cursor.v)), cid: String(cursor.id ?? '0') },
      );
    }

    qb.orderBy('n.read_at IS NULL', 'DESC')
      .addOrderBy('n.created_at', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const kept = rows.slice(0, limit);
    const last = kept[kept.length - 1];
    const next = hasMore && last ? encodeCursor({ u: last.read_at === null ? 1 : 0, v: last.created_at.toISOString(), id: last.id }) : null;
    return cursorPage(kept.map((n) => this.view(n)), limit, next);
  }

  async markRead(userId: string, id: string) {
    const row = await this.repo.findOne({ where: { id, recipient_id: userId } });
    if (!row) return null;
    if (row.read_at === null) {
      row.read_at = new Date();
      await this.repo.save(row);
    }
    return this.view(row);
  }

  /** Single UPDATE … WHERE read_at IS NULL (§6.13). Returns cleared count. */
  async markAllRead(userId: string): Promise<number> {
    const res = await this.repo.update({ recipient_id: userId, read_at: IsNull() }, { read_at: new Date() });
    return res.affected ?? 0;
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { recipient_id: userId, read_at: IsNull() } });
  }

  private view(n: Notification) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      payload: n.payload,
      read_at: n.read_at,
      created_at: n.created_at,
    };
  }
}
