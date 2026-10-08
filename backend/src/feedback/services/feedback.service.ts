import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../../entities';
import { AuthUser } from '../../common/decorators';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';

/**
 * §6.15 feedback (user side). A thread opens as `open`; the admin module owns
 * the reply/resolve transitions. This service only records and lists the
 * caller's own threads.
 */
@Injectable()
export class FeedbackService {
  constructor(@InjectRepository(Feedback) private readonly feedback: Repository<Feedback>) {}

  async create(user: AuthUser, content: string) {
    const saved = await this.feedback.save(this.feedback.create({ user_id: user.id, content, status: 'open' }));
    return this.view(saved);
  }

  async mine(user: AuthUser, query: { cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.feedback
      .createQueryBuilder('f')
      .where('f.user_id = :userId', { userId: user.id })
      .orderBy('f.created_at', 'DESC')
      .addOrderBy('f.id', 'DESC')
      .take(limit + 1);
    if (cursor?.v) qb.andWhere('f.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb.getMany();
    const kept = rows.slice(0, limit);
    const last = kept[kept.length - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.created_at.toISOString(), id: last.id }) : null;
    return cursorPage(kept.map((f) => this.view(f)), limit, next);
  }

  private view(f: Feedback) {
    return { id: f.id, content: f.content, reply: f.reply, status: f.status, created_at: f.created_at };
  }
}
