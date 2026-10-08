import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CampusEvent, EventRegistration } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { EventStatus } from '../../common/auth.types';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { hmacSha256, safeEqual, uuid } from '../../common/util/tokens';
import { CreateEventDto, EventQueryDto, UpdateEventDto } from '../dto/event.dto';

interface TicketPayload {
  e: string;
  u: string;
  n: string;
  exp: number;
}

/**
 * §6.10 campus events + registrations + tickets. Capacity is enforced under a
 * `SELECT … FOR UPDATE` row lock so concurrent registers can never oversell.
 * The ticket replaces the spoofable `thuie://user/<id>` deep link: it is an
 * HMAC-signed, short-lived, single-use token bound to (event, user, nonce); a
 * replayed scan is rejected because `used_at` is set on first check-in.
 */
@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(CampusEvent) private readonly events: Repository<CampusEvent>,
    @InjectRepository(EventRegistration) private readonly regs: Repository<EventRegistration>,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('ticket.secret') ?? 'dev-only-ticket-secret';
    this.ttlSec = (config.get<number>('ticket.ttlMin') ?? 10) * 60;
  }

  private readonly secret: string;
  private readonly ttlSec: number;

  // --------------------------------------------------------------- read side --

  async list(query: EventQueryDto) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const status = query.status ?? 'published';
    const qb = this.events
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.cover_media', 'cover')
      .where('e.status = :status', { status });
    if (query.type) qb.andWhere('e.type = :type', { type: query.type });
    if (query.starts_at) qb.andWhere('e.starts_at >= :from', { from: new Date(query.starts_at) });
    if (cursor?.v) qb.andWhere('(e.starts_at, e.id) < (:cv, :cid)', { cv: new Date(String(cursor.v)), cid: String(cursor.id ?? '0') });
    const rows = await qb.orderBy('e.starts_at', 'ASC').addOrderBy('e.id', 'ASC').take(limit + 1).getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.starts_at.toISOString(), id: last.id }) : null;
    const counts = await this.registeredCounts(rows.map((e) => e.id));
    return cursorPage(rows.slice(0, limit).map((e) => this.view(e, false, counts.get(e.id) ?? 0)), limit, next);
  }

  async detail(user: AuthUser | null, id: string) {
    const e = await this.load(id);
    if (e.status !== 'published' && !(user?.is_admin || e.created_by === user?.id)) throw ApiException.notFound('Event not found');
    const count = await this.registeredCount(id);
    const mine = user ? await this.regs.findOne({ where: { event_id: id, user_id: user.id } }) : null;
    return {
      ...this.view(e, true, count),
      registered: mine ? mine.status !== 'cancelled' : false,
      my_status: mine?.status ?? null,
    };
  }

  async myRegistrations(user: AuthUser, upcoming?: string) {
    const qb = this.regs
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.event', 'e')
      .leftJoinAndSelect('e.cover_media', 'cover')
      .where('r.user_id = :userId', { userId: user.id })
      .andWhere("r.status <> 'cancelled'");
    if (upcoming === 'true' || upcoming === '1') qb.andWhere('e.starts_at >= now()');
    const rows = await qb.orderBy('e.starts_at', 'ASC').getMany();
    return {
      data: rows.map((r) => ({
        event_id: r.event_id,
        status: r.status,
        registered_at: r.registered_at,
        used_at: r.used_at,
        has_ticket: Boolean(r.ticket_nonce),
        event: r.event ? this.view(r.event, false, 0) : null,
      })),
      meta: { total: rows.length },
    };
  }

  // -------------------------------------------------------------- read side (attendees) --

  /** Organizer/admin view of *who* signed up (§6.10): the active registrations
   *  for one event with each attendee's identity + check-in state. Cancelled
   *  seats are hidden so the list matches the public head-count. */
  async registrations(user: AuthUser, eventId: string) {
    const e = await this.load(eventId);
    this.assertManager(user, e);
    const rows = await this.regs
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('u.avatar_media', 'avatar')
      .where('r.event_id = :id', { id: eventId })
      .andWhere("r.status <> 'cancelled'")
      .orderBy('r.registered_at', 'ASC')
      .getMany();
    const attended = rows.filter((r) => r.status === 'attended').length;
    return {
      event_id: eventId,
      total: rows.length,
      attended,
      capacity: e.capacity,
      data: rows.map((r) => ({
        user_id: r.user_id,
        name: r.user?.name ?? null,
        student_id: r.user?.student_id ?? null,
        avatar_url: r.user?.avatar_media?.url ?? null,
        status: r.status,
        registered_at: r.registered_at,
        used_at: r.used_at,
      })),
    };
  }

  /** Public "who's going" roster (§6.10): the active registrations for one
   *  event, exposed to any logged-in viewer. Identity only — a name + avatar —
   *  so it never leaks check-in state or student id, which stay manager-only in
   *  `registrations()`. Cancelled seats are hidden to match the public head-count. */
  async attendees(eventId: string) {
    await this.load(eventId); // 404 if the event doesn't exist
    const rows = await this.regs
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('u.avatar_media', 'avatar')
      .where('r.event_id = :id', { id: eventId })
      .andWhere("r.status <> 'cancelled'")
      .orderBy('r.registered_at', 'ASC')
      .getMany();
    return {
      event_id: eventId,
      total: rows.length,
      data: rows.map((r) => ({
        user_id: r.user_id,
        name: r.user?.name ?? null,
        avatar_url: r.user?.avatar_media?.url ?? null,
      })),
    };
  }

  // -------------------------------------------------------------- write side --

  async create(dto: CreateEventDto, actorId: string) {
    const starts = new Date(dto.starts_at);
    const saved = await this.events.save(
      this.events.create({
        title: dto.title,
        description: dto.description ?? null,
        starts_at: starts,
        ends_at: dto.ends_at ? new Date(dto.ends_at) : new Date(starts.getTime() + 3 * 3600_000),
        location: dto.location ?? null,
        organizer: dto.organizer ?? null,
        type: dto.type ?? 'other',
        capacity: dto.capacity ?? null,
        cover_media_id: dto.cover_media_id ?? null,
        status: (dto.status ?? 'draft') as EventStatus,
        timezone: dto.timezone ?? 'Asia/Shanghai',
        created_by: actorId,
      }),
    );
    return this.view(await this.load(saved.id), true, 0);
  }

  async update(user: AuthUser, id: string, dto: UpdateEventDto) {
    const e = await this.load(id);
    this.assertManager(user, e);
    const scalar: Array<keyof UpdateEventDto> = ['title', 'description', 'location', 'organizer', 'type', 'cover_media_id', 'status', 'timezone'];
    for (const key of scalar) {
      const value = dto[key];
      if (value !== undefined) (e as any)[key] = value === '' ? null : value;
    }
    if (dto.starts_at !== undefined) e.starts_at = new Date(dto.starts_at);
    if (dto.ends_at !== undefined) e.ends_at = new Date(dto.ends_at);
    if (dto.capacity !== undefined) e.capacity = dto.capacity;
    await this.events.save(e);
    return this.view(await this.load(id), true, await this.registeredCount(id));
  }

  /** Capacity-safe register. Idempotent: a re-register of an active seat is a no-op. */
  async register(user: AuthUser, eventId: string) {
    await this.events.manager.transaction(async (m: EntityManager) => {
      // Row lock serialises concurrent registers against the same event.
      const event = await m
        .createQueryBuilder(CampusEvent, 'e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: eventId })
        .getOne();
      if (!event) throw ApiException.notFound('Event not found');
      if (event.status !== 'published') throw ApiException.conflict('Event is not open for registration', 'not_open');

      const existing = await m.findOne(EventRegistration, { where: { event_id: eventId, user_id: user.id } });
      if (existing && existing.status !== 'cancelled') return; // already registered

      if (event.capacity != null) {
        const count = await m
          .createQueryBuilder(EventRegistration, 'r')
          .where('r.event_id = :id', { id: eventId })
          .andWhere("r.status <> 'cancelled'")
          .getCount();
        if (count >= event.capacity) throw ApiException.conflict('This event is full', 'capacity_reached');
      }

      if (existing) {
        existing.status = 'registered';
        existing.registered_at = new Date();
        existing.ticket_nonce = existing.ticket_nonce ?? uuid();
        existing.used_at = null;
        await m.save(existing);
      } else {
        await m.save(
          m.create(EventRegistration, { event_id: eventId, user_id: user.id, status: 'registered', ticket_nonce: uuid() }),
        );
      }
    });
    return { registered: true, event_id: eventId };
  }

  async cancel(user: AuthUser, eventId: string) {
    const r = await this.regs.findOne({ where: { event_id: eventId, user_id: user.id } });
    if (!r) throw ApiException.notFound('You are not registered for this event');
    r.status = 'cancelled';
    await this.regs.save(r);
    return { cancelled: true };
  }

  async ticket(user: AuthUser, eventId: string) {
    const r = await this.regs.findOne({ where: { event_id: eventId, user_id: user.id } });
    if (!r || r.status === 'cancelled') throw ApiException.notFound('You are not registered for this event');
    if (r.status === 'attended') throw ApiException.conflict('Ticket already used', 'already_checked_in');
    if (!r.ticket_nonce) {
      r.ticket_nonce = uuid();
      await this.regs.save(r);
    }
    const exp = Math.floor(Date.now() / 1000) + this.ttlSec;
    return {
      ticket: this.sign({ e: eventId, u: user.id, n: r.ticket_nonce, exp }),
      event_id: eventId,
      expires_at: new Date(exp * 1000).toISOString(),
    };
  }

  /** Organizer/admin scans a ticket ⇒ marks the holder attended; replay + expiry rejected. */
  async checkIn(user: AuthUser, eventId: string, token: string) {
    const event = await this.load(eventId);
    this.assertManager(user, event);
    const payload = this.verify(token);
    if (!payload) throw ApiException.permissionDenied('Invalid ticket signature');
    if (payload.e !== eventId) throw ApiException.permissionDenied('Ticket is for a different event');
    if (payload.exp < Math.floor(Date.now() / 1000)) throw ApiException.tokenExpired('Ticket expired — refresh it');

    const r = await this.regs.findOne({ where: { event_id: eventId, user_id: payload.u } });
    if (!r || r.status === 'cancelled') throw ApiException.notFound('No registration for this ticket');
    if (r.ticket_nonce !== payload.n) throw ApiException.permissionDenied('Ticket nonce mismatch');
    if (r.used_at || r.status === 'attended') throw ApiException.conflict('Ticket already used', 'already_checked_in');

    r.status = 'attended';
    r.used_at = new Date();
    await this.regs.save(r);
    return { attended: true, user_id: payload.u };
  }

  // -------------------------------------------------------------- ticket crypto --

  private sign(p: TicketPayload): string {
    const body = Buffer.from(JSON.stringify(p), 'utf8').toString('base64url');
    return `${body}.${hmacSha256(this.secret, body)}`;
  }

  private verify(token: string): TicketPayload | null {
    const [body, sig] = String(token).split('.');
    if (!body || !sig) return null;
    if (!safeEqual(sig, hmacSha256(this.secret, body))) return null;
    try {
      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TicketPayload;
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------ helpers --

  private assertManager(user: AuthUser, e: CampusEvent) {
    if (!user.is_admin && e.created_by !== user.id) throw ApiException.permissionDenied('Only the organizer or an admin can manage this event');
  }

  private async load(id: string): Promise<CampusEvent> {
    const e = await this.events.findOne({ where: { id }, relations: { cover_media: true, creator: true } });
    if (!e) throw ApiException.notFound('Event not found');
    return e;
  }

  private async registeredCount(eventId: string): Promise<number> {
    return this.regs
      .createQueryBuilder('r')
      .where('r.event_id = :id', { id: eventId })
      .andWhere("r.status <> 'cancelled'")
      .getCount();
  }

  private async registeredCounts(ids: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (ids.length === 0) return map;
    const rows = await this.regs
      .createQueryBuilder('r')
      .select('r.event_id', 'event_id')
      .addSelect('COUNT(*)', 'n')
      .where('r.event_id IN (:...ids)', { ids })
      .andWhere("r.status <> 'cancelled'")
      .groupBy('r.event_id')
      .getRawMany();
    for (const row of rows) map.set(String(row.event_id), Number(row.n));
    return map;
  }

  private view(e: CampusEvent, full: boolean, registered: number) {
    return {
      id: e.id,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at ?? new Date(e.starts_at.getTime() + 3 * 3600_000),
      location: e.location,
      organizer: e.organizer,
      type: e.type,
      status: e.status,
      capacity: e.capacity,
      registered,
      spots_left: e.capacity == null ? null : Math.max(e.capacity - registered, 0),
      timezone: e.timezone,
      cover_url: e.cover_media?.url ?? null,
      created_by: e.created_by,
      created_at: e.created_at,
      ...(full ? { description: e.description } : {}),
    };
  }
}
