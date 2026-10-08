import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MentorProfile, MentorshipApplication, User } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { NotificationService } from '../../notifications/services/notification.service';
import { ApplicationQueryDto, CreateApplicationDto, CreateMentorDto, MentorQueryDto } from '../dto/mentorship.dto';

/**
 * §6.11 mentorship. Mentors offer expertise (activated by admins via the review
 * queue); mentees apply, and the mentor accepts/rejects. Accepting enforces
 * `max_mentees` under a `SELECT … FOR UPDATE` lock on the mentor row so two
 * simultaneous accepts can never over-subscribe a mentor. The DDL partial-unique
 * index keeps at most one pending/accepted row per pair.
 */
@Injectable()
export class MentorshipService {
  constructor(
    @InjectRepository(MentorProfile) private readonly mentors: Repository<MentorProfile>,
    @InjectRepository(MentorshipApplication) private readonly apps: Repository<MentorshipApplication>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationService,
  ) {}

  async listMentors(query: MentorQueryDto) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.mentors
      .createQueryBuilder('mp')
      .leftJoinAndSelect('mp.user', 'u')
      .leftJoinAndSelect('u.avatar_media', 'avatar')
      .where("mp.status = 'active'");
    if (query.area) qb.andWhere('mp.mentor_area ILIKE :area', { area: `%${query.area}%` });
    if (cursor?.v) qb.andWhere('(mp.created_at, mp.id) < (:cv, :cid)', { cv: new Date(String(cursor.v)), cid: String(cursor.id ?? '0') });
    const rows = await qb.orderBy('mp.created_at', 'DESC').addOrderBy('mp.id', 'DESC').take(limit + 1).getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.created_at.toISOString(), id: last.id }) : null;
    const counts = await this.currentMenteeCounts(rows.map((r) => r.user_id));
    return cursorPage(rows.slice(0, limit).map((mp) => this.mentorView(mp, counts.get(mp.user_id) ?? 0)), limit, next);
  }

  async becomeMentor(user: AuthUser, dto: CreateMentorDto) {
    const existing = await this.mentors.findOne({ where: { user_id: user.id } });
    if (existing) throw ApiException.conflict('You are already registered as a mentor', 'mentor_exists', { mentor_id: existing.id });
    const saved = await this.mentors.save(
      this.mentors.create({
        user_id: user.id,
        expertise: dto.expertise,
        mentor_area: dto.mentor_area ?? null,
        max_mentees: dto.max_mentees ?? 3,
        status: 'pending',
      }),
    );
    return this.mentorView(await this.loadMentor(saved.id), 0);
  }

  async apply(user: AuthUser, dto: CreateApplicationDto) {
    const mentorUserId = String(dto.mentor_user_id);
    if (mentorUserId === user.id) throw ApiException.validationFailed([{ field: 'mentor_user_id', message: 'cannot apply to yourself' }]);
    const mentor = await this.mentors.findOne({ where: { user_id: mentorUserId, status: 'active' } });
    if (!mentor) throw ApiException.notFound('Mentor not found');
    const active = await this.apps
      .createQueryBuilder('a')
      .where('a.mentor_user_id = :m AND a.mentee_user_id = :me', { m: mentorUserId, me: user.id })
      .andWhere("a.status IN (:...open)", { open: ['pending', 'accepted'] })
      .getOne();
    if (active) throw ApiException.conflict('You already have an active application with this mentor', 'duplicate_active_pair', { application_id: active.id });

    const saved = await this.apps.save(
      this.apps.create({ mentor_user_id: mentorUserId, mentee_user_id: user.id, message: dto.message ?? null, status: 'pending' }),
    );
    await this.notify(mentorUserId, user.id, 'New mentorship application', dto.message ?? 'Someone applied to be mentored by you.');
    return this.appView(await this.loadApp(saved.id), user.id);
  }

  /** Mentor accepts (capacity-checked) or rejects a pending application. */
  async respond(user: AuthUser, id: string, status: 'accepted' | 'rejected') {
    const app = await this.apps.findOne({ where: { id } });
    if (!app) throw ApiException.notFound('Application not found');
    if (app.mentor_user_id !== user.id) throw ApiException.permissionDenied('Only the mentor can respond');
    if (app.status !== 'pending') throw ApiException.conflict('Application is no longer pending', 'not_pending');

    if (status === 'accepted') {
      await this.apps.manager.transaction(async (m: EntityManager) => {
        const mentor = await m
          .createQueryBuilder(MentorProfile, 'mp')
          .setLock('pessimistic_write')
          .where('mp.user_id = :uid', { uid: app.mentor_user_id })
          .getOne();
        if (!mentor) throw ApiException.notFound('Mentor not found');
        const current = await m
          .createQueryBuilder(MentorshipApplication, 'a')
          .where('a.mentor_user_id = :uid AND a.status = :accepted', { uid: app.mentor_user_id, accepted: 'accepted' })
          .getCount();
        if (current >= mentor.max_mentees) throw ApiException.conflict('This mentor has no open slots', 'capacity_reached');
        const row = await m.findOne(MentorshipApplication, { where: { id } });
        if (!row) throw ApiException.notFound();
        row.status = 'accepted';
        row.responded_at = new Date();
        await m.save(row);
      });
    } else {
      app.status = 'rejected';
      app.responded_at = new Date();
      await this.apps.save(app);
    }

    await this.notify(app.mentee_user_id, user.id, `Mentorship application ${status}`, status === 'accepted' ? 'Your mentor accepted your application.' : 'Your application was declined.');
    return this.appView(await this.loadApp(id), user.id);
  }

  /** Mentee withdraws a pending request; either party ends an accepted pairing. */
  async withdrawOrEnd(user: AuthUser, id: string) {
    const app = await this.apps.findOne({ where: { id } });
    if (!app) throw ApiException.notFound('Application not found');
    const iAmMentor = app.mentor_user_id === user.id;
    const iAmMentee = app.mentee_user_id === user.id;
    if (!iAmMentor && !iAmMentee) throw ApiException.permissionDenied('Not your application');

    if (app.status === 'pending') {
      if (!iAmMentee) throw ApiException.permissionDenied('Only the mentee can withdraw a pending request');
      app.status = 'withdrawn';
    } else if (app.status === 'accepted') {
      app.status = 'ended';
      app.ended_at = new Date();
    } else {
      throw ApiException.conflict('Application is already closed', 'not_active');
    }
    app.responded_at = app.responded_at ?? new Date();
    await this.apps.save(app);
    return this.appView(await this.loadApp(id), user.id);
  }

  async listApplications(user: AuthUser, query: ApplicationQueryDto) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const role = query.role ?? 'incoming';
    const column = role === 'incoming' ? 'mentor_user_id' : 'mentee_user_id';
    const qb = this.apps
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.mentor', 'mentor')
      .leftJoinAndSelect('mentor.avatar_media', 'ma')
      .leftJoinAndSelect('a.mentee', 'mentee')
      .leftJoinAndSelect('mentee.avatar_media', 'mea')
      .where(`a.${column} = :userId`, { userId: user.id });
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (cursor?.v) qb.andWhere('a.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb.orderBy('a.created_at', 'DESC').addOrderBy('a.id', 'DESC').take(limit + 1).getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.created_at.toISOString(), id: last.id }) : null;
    return cursorPage(rows.slice(0, limit).map((a) => this.appView(a, user.id)), limit, next);
  }

  // ------------------------------------------------------------------ helpers --

  private async loadMentor(id: string): Promise<MentorProfile> {
    const mp = await this.mentors.findOne({ where: { id }, relations: { user: { avatar_media: true } } });
    if (!mp) throw ApiException.notFound('Mentor profile not found');
    return mp;
  }

  private async loadApp(id: string): Promise<MentorshipApplication> {
    const a = await this.apps.findOne({
      where: { id },
      relations: { mentor: { avatar_media: true }, mentee: { avatar_media: true } },
    });
    if (!a) throw ApiException.notFound('Application not found');
    return a;
  }

  private async currentMenteeCounts(mentorIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (mentorIds.length === 0) return map;
    const rows = await this.apps
      .createQueryBuilder('a')
      .select('a.mentor_user_id', 'mentor_user_id')
      .addSelect('COUNT(*)', 'n')
      .where('a.mentor_user_id IN (:...ids)', { ids: mentorIds })
      .andWhere("a.status = 'accepted'")
      .groupBy('a.mentor_user_id')
      .getRawMany();
    for (const row of rows) map.set(String(row.mentor_user_id), Number(row.n));
    return map;
  }

  private async notify(recipientId: string, actorId: string, title: string, body: string) {
    const actor = await this.users.findOne({ where: { id: actorId }, relations: { avatar_media: true } });
    await this.notifications.notify({
      recipientId,
      type: 'system',
      title,
      body: actor ? `${actor.name}: ${body}` : body,
      // Carry the actor brief so the inbox shows the person (avatar + name).
      payload: {
        route: 'mentorship',
        targetType: 'user',
        targetId: actorId,
        actor: actor ? { id: actor.id, name: actor.name, avatar_url: actor.avatar_media?.url ?? null } : null,
      },
    });
  }

  private mentorView(mp: MentorProfile, currentMentees: number) {
    return {
      id: mp.id,
      user: this.brief(mp.user),
      expertise: mp.expertise,
      mentor_area: mp.mentor_area,
      // Program / class (grade year) are person attributes carried on the owning
      // user, which listMentors already joins — surfaced so the mentor card and
      // detail can show them without a second alumni fetch.
      program: mp.user?.program ?? null,
      grade_year: mp.user?.grade_year ?? null,
      max_mentees: mp.max_mentees,
      current_mentees: currentMentees,
      status: mp.status,
      created_at: mp.created_at,
    };
  }

  private appView(a: MentorshipApplication, viewerId: string) {
    const iAmMentor = a.mentor_user_id === viewerId;
    return {
      id: a.id,
      status: a.status,
      message: a.message,
      mentor: this.brief(a.mentor),
      mentee: this.brief(a.mentee),
      counterparty: this.brief(iAmMentor ? a.mentee : a.mentor),
      can_respond: iAmMentor && a.status === 'pending',
      created_at: a.created_at,
      responded_at: a.responded_at,
      ended_at: a.ended_at,
    };
  }

  private brief(u?: User | null) {
    if (!u) return null;
    return { id: u.id, name: u.name, role: u.role, avatar_url: u.avatar_media?.url ?? null };
  }
}
