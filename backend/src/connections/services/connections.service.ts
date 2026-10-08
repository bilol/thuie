import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Block, Connection, User } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { ConnectionStatus } from '../../common/auth.types';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { NotificationService } from '../../notifications/services/notification.service';

/**
 * §6.9 connections + blocks. A connection is a directed request row that flips
 * to `accepted`; the accepted network is queryable in both directions (the
 * service unions `from_`/`to_`). Blocks are the §12.7 privacy switch: they
 * revoke any existing connection and forbid DMs (enforced in messaging).
 */
@Injectable()
export class ConnectionsService {
  constructor(
    @InjectRepository(Connection) private readonly connections: Repository<Connection>,
    @InjectRepository(Block) private readonly blocks: Repository<Block>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationService,
  ) {}

  // ------------------------------------------------------------- connections --

  async list(userId: string, query: { box?: 'requests' | 'mine' | 'accepted'; cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const box = query.box ?? 'accepted';
    const qb = this.connections
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.from_user', 'fu')
      .leftJoinAndSelect('fu.avatar_media', 'fua')
      .leftJoinAndSelect('c.to_user', 'tu')
      .leftJoinAndSelect('tu.avatar_media', 'tua');

    if (box === 'requests') {
      qb.where('c.to_user_id = :userId', { userId }).andWhere('c.status = :pending', { pending: 'pending' });
    } else if (box === 'mine') {
      qb.where('c.from_user_id = :userId', { userId });
    } else {
      qb.where('(c.from_user_id = :userId OR c.to_user_id = :userId)', { userId }).andWhere('c.status = :accepted', { accepted: 'accepted' });
    }
    if (cursor?.v) qb.andWhere('c.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb.orderBy('c.created_at', 'DESC').addOrderBy('c.id', 'DESC').take(limit + 1).getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.created_at.toISOString(), id: last.id }) : null;
    return cursorPage(rows.slice(0, limit).map((c) => this.view(c, userId)), limit, next);
  }

  async create(userId: string, input: { to_user_id: string; message?: string }) {
    const targetId = String(input.to_user_id);
    if (targetId === userId) throw ApiException.validationFailed([{ field: 'to_user_id', message: 'cannot connect to yourself' }]);
    const target = await this.users.findOne({ where: { id: targetId } });
    if (!target || target.status === 'deleted') throw ApiException.notFound('User not found');
    if (await this.isBlockedBetween(userId, targetId)) throw ApiException.permissionDenied('Cannot send a connection request');

    const existing = await this.connections
      .createQueryBuilder('c')
      .where('((c.from_user_id = :me AND c.to_user_id = :them) OR (c.from_user_id = :them AND c.to_user_id = :me))', { me: userId, them: targetId })
      .andWhere('c.status IN (:...active)', { active: ['pending', 'accepted'] })
      .getOne();

    if (existing) {
      // Mutual connect: they already asked → this acts as the accept (§6.9).
      if (existing.status === 'accepted') throw ApiException.conflict('Already connected', 'already_connected');
      if (existing.from_user_id === userId) throw ApiException.conflict('Request already pending', 'already_requested');
      return this.respond(userId, existing.id, 'accepted');
    }

    // No active row, but `connections` has UNIQUE (from_user_id, to_user_id), so a
    // prior ask in this same direction may still exist as a terminal 'revoked' /
    // 'declined' row (we just withdrew, or they declined). Inserting a second row
    // would raise 23505 → a 500 "something went wrong". Revive that row instead.
    const stale = await this.connections.findOne({ where: { from_user_id: userId, to_user_id: targetId } });
    if (stale) {
      stale.status = 'pending';
      stale.message = input.message ?? null;
      stale.responded_at = null;
      const revived = await this.connections.save(stale);
      await this.notifyConnection(targetId, userId, 'You have a new connection request', input.message ?? 'Someone wants to connect with you.');
      return this.view(await this.load(revived.id), userId);
    }

    const row = await this.connections.save(
      this.connections.create({ from_user_id: userId, to_user_id: targetId, status: 'pending', message: input.message ?? null }),
    );
    await this.notifyConnection(targetId, userId, 'You have a new connection request', input.message ?? 'Someone wants to connect with you.');
    return this.view(await this.load(row.id), userId);
  }

  /** Recipient accepts/declines a pending request; either party revokes an accepted pair. */
  async respond(userId: string, id: string, status: 'accepted' | 'declined' | 'revoked') {
    const c = await this.connections.findOne({ where: { id } });
    if (!c) throw ApiException.notFound('Connection not found');
    const iAmRequester = c.from_user_id === userId;
    const iAmRecipient = c.to_user_id === userId;
    if (!iAmRequester && !iAmRecipient) throw ApiException.permissionDenied('Not your connection');

    if (status === 'revoked') {
      // Either side drops an accepted pair; the requester may also cancel their
      // own still-pending ask.
      const cancelOwnPending = c.status === 'pending' && iAmRequester;
      if (c.status !== 'accepted' && !cancelOwnPending) throw ApiException.conflict('Nothing to revoke', 'not_connected');
    } else {
      if (!iAmRecipient) throw ApiException.permissionDenied('Only the recipient can respond');
      if (c.status !== 'pending') throw ApiException.conflict('Request is no longer pending', 'not_pending');
    }

    c.status = status as ConnectionStatus;
    c.responded_at = new Date();
    await this.connections.save(c);

    if (status === 'accepted') {
      const other = iAmRecipient ? c.from_user_id : c.to_user_id;
      await this.notifyConnection(other, userId, 'Your connection request was accepted', 'You are now connected.');
    }
    return this.view(await this.load(id), userId);
  }

  // ------------------------------------------------------------------- blocks --

  async listBlocks(userId: string) {
    const rows = await this.blocks.find({
      where: { blocker_id: userId },
      relations: { blocked: { avatar_media: true } },
      order: { created_at: 'DESC' },
    });
    return { data: rows.map((b) => this.brief(b.blocked)), meta: { total: rows.length } };
  }

  async block(userId: string, targetId: string) {
    const tid = String(targetId);
    if (tid === userId) throw ApiException.validationFailed([{ field: 'user_id', message: 'cannot block yourself' }]);
    const target = await this.users.findOne({ where: { id: tid } });
    if (!target) throw ApiException.notFound('User not found');
    await this.connections.manager.transaction(async (m: EntityManager) => {
      await m.getRepository(Block).upsert(
        { blocker_id: userId, blocked_id: tid },
        { conflictPaths: ['blocker_id', 'blocked_id'] },
      );
      // Blocking severs any existing connection in both directions (§12.7).
      await m
        .createQueryBuilder()
        .update(Connection)
        .set({ status: 'revoked', responded_at: new Date() })
        .where('((from_user_id = :me AND to_user_id = :them) OR (from_user_id = :them AND to_user_id = :me))', { me: userId, them: tid })
        .andWhere('status IN (:...active)', { active: ['pending', 'accepted'] })
        .execute();
    });
    return { blocked: true };
  }

  async unblock(userId: string, targetId: string) {
    await this.blocks.delete({ blocker_id: userId, blocked_id: String(targetId) });
    return { blocked: false };
  }

  async hasBlocked(blockerId: string, targetId: string): Promise<boolean> {
    const row = await this.blocks.findOne({ where: { blocker_id: blockerId, blocked_id: String(targetId) } });
    return Boolean(row);
  }

  // ------------------------------------------------------------------ helpers --

  private async isBlockedBetween(a: string, b: string): Promise<boolean> {
    const n = await this.blocks
      .createQueryBuilder('b')
      .where('((b.blocker_id = :a AND b.blocked_id = :b) OR (b.blocker_id = :b AND b.blocked_id = :a))', { a, b })
      .getCount();
    return n > 0;
  }

  private async notifyConnection(recipientId: string, actorId: string, title: string, body: string) {
    const actor = await this.users.findOne({ where: { id: actorId }, relations: { avatar_media: true } });
    await this.notifications.notify({
      recipientId,
      type: 'connection',
      title,
      body: actor ? `${actor.name}: ${body}` : body,
      // Carry the actor brief so the inbox can show who the request is from
      // (avatar + name) without a second round-trip; `targetId` stays the deep link.
      payload: {
        route: 'connections',
        targetType: 'user',
        targetId: actorId,
        actor: actor ? { id: actor.id, name: actor.name, avatar_url: actor.avatar_media?.url ?? null } : null,
      },
    });
  }

  private async load(id: string): Promise<Connection> {
    const c = await this.connections.findOne({
      where: { id },
      relations: { from_user: { avatar_media: true }, to_user: { avatar_media: true } },
    });
    if (!c) throw ApiException.notFound('Connection not found');
    return c;
  }

  private view(c: Connection, userId: string) {
    const other = c.from_user_id === userId ? c.to_user : c.from_user;
    return {
      id: c.id,
      status: c.status,
      message: c.message,
      created_at: c.created_at,
      responded_at: c.responded_at,
      user: this.brief(other),
    };
  }

  private brief(u?: User | null) {
    if (!u) return null;
    return { id: u.id, name: u.name, role: u.role, avatar_url: u.avatar_media?.url ?? null };
  }
}
