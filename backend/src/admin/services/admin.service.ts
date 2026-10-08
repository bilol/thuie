import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlumniProfile, Comment, Feedback, ForumPost, IdentityChangeLog, InfoPost, Report, User,
} from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { hashPassword } from '../../common/util/password-hash';
import { AuthUser } from '../../common/decorators';
import { ContentStatus, ModerationTargetType, ProfileStatus, UserStatus } from '../../common/auth.types';
import { PageQuery } from '../../common/dto/query.dto';
import { offsetPage } from '../../common/pagination/page';
import { serializeUser } from '../../common/serializers/user.serializer';
import { ModerationService } from '../../moderation/services/moderation.service';
import { ReportService } from '../../moderation/services/report.service';
import { KeywordService } from '../../moderation/services/keyword.service';
import { RoleService } from '../../auth/services/role.service';
import { UsersService } from '../../users/services/users.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { OperationLogService } from './operation-log.service';
import { BatchConvertDto, ConvertUserDto, CreateUserDto, RoleStrategyUpdateDto, UpdateUserDto } from '../dto/admin.dto';

type ReviewItem = { target_type: ModerationTargetType; target_id: string; title: string; submitted_at: Date; author: Record<string, unknown> | null };

/**
 * §6.17 admin & trust operations. Deliberately thin over the primitives that
 * already own each concern: the moderation lifecycle routes through
 * {@link ModerationService} (audit), reports through {@link ReportService},
 * keywords through {@link KeywordService}, role flags through {@link RoleService}
 * and every mutating action writes an {@link OperationLog} row.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(InfoPost) private readonly infos: Repository<InfoPost>,
    @InjectRepository(ForumPost) private readonly posts: Repository<ForumPost>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(AlumniProfile) private readonly alumni: Repository<AlumniProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Report) private readonly reportRepo: Repository<Report>,
    @InjectRepository(IdentityChangeLog) private readonly identityLogs: Repository<IdentityChangeLog>,
    @InjectRepository(Feedback) private readonly feedbacks: Repository<Feedback>,
    private readonly moderation: ModerationService,
    private readonly reports: ReportService,
    private readonly keywords: KeywordService,
    private readonly roles: RoleService,
    private readonly usersSvc: UsersService,
    private readonly notifications: NotificationService,
    private readonly oplog: OperationLogService,
  ) {}

  // ---------------------------------------------------------------- review ----

  async reviewQueue(query: PageQuery & { type?: ModerationTargetType }) {
    const items = await this.collectPending(query.type);
    items.sort((a, b) => b.submitted_at.getTime() - a.submitted_at.getTime());
    const page = items.slice(query.offset(), query.offset() + query.limit);
    return offsetPage(page, query.page, query.limit, items.length);
  }

  async approve(actor: AuthUser, type: ModerationTargetType, id: string) {
    return this.transition(actor, type, id, 'approved');
  }

  async reject(actor: AuthUser, type: ModerationTargetType, id: string, reason?: string) {
    return this.transition(actor, type, id, 'rejected', reason);
  }

  async takedown(actor: AuthUser, type: ModerationTargetType, id: string, reason?: string) {
    return this.transition(actor, type, id, 'taken_down', reason);
  }

  /** Shared status write → moderation audit → author notification → admin log. */
  private async transition(actor: AuthUser, type: ModerationTargetType, id: string, action: 'approved' | 'rejected' | 'taken_down', reason?: string) {
    const target = await this.loadTarget(type, id);
    if (!target) throw ApiException.notFound('Content not found');

    const status = this.nextStatus(type, action);
    await this.applyStatus(type, id, status, action === 'rejected' ? reason ?? null : null);
    await this.moderation.record({ targetType: type, targetId: id, action, actorId: actor.id, reason: reason ?? null });

    const label = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'taken down';
    if (target.authorId) {
      await this.notifications.notify({
        recipientId: target.authorId,
        type: 'review_result',
        title: `Your ${this.noun(type)} was ${label}`,
        body: reason ?? `Status: ${status}.`,
        payload: { targetType: type, targetId: id },
      });
    }
    await this.oplog.log({ adminId: actor.id, action: `content.${action}`, targetType: type, targetId: id, detail: reason ? { reason } : null });
    return { target_type: type, target_id: id, status };
  }

  // --------------------------------------------------------------- reports ----

  async reportsQueue(query: PageQuery & { status?: Report['status'] }) {
    const { rows, total } = await this.reports.queue({ status: query.status }, query.limit, query.offset());
    return offsetPage(rows, query.page, query.limit, total);
  }

  async resolveReport(actor: AuthUser, id: string, outcome: 'ignored' | 'deleted' | 'restricted', note?: string) {
    const view = await this.reports.resolve(id, actor.id, outcome, note);
    await this.oplog.log({ adminId: actor.id, action: `report.resolve`, targetType: 'report', targetId: id, detail: { outcome } });
    return view;
  }

  history(type: ModerationTargetType, id: string) {
    return this.moderation.history(type, id);
  }

  // -------------------------------------------------------------- keywords ----

  listKeywords() {
    return this.keywords.list();
  }

  async createKeyword(actor: AuthUser, input: { word: string; action: 'block' | 'manual_review'; enabled?: boolean }) {
    const row = await this.keywords.create({ word: input.word, action: input.action, created_by: actor.id });
    if (input.enabled !== undefined) await this.keywords.update(row.id, { enabled: input.enabled });
    await this.oplog.log({ adminId: actor.id, action: 'keyword.create', targetType: 'keyword', targetId: row.id, detail: { word: input.word, action: input.action } });
    return this.keywords.list().then((all) => all.find((k) => k.id === row.id) ?? row);
  }

  async updateKeyword(actor: AuthUser, id: string, patch: { action?: 'block' | 'manual_review'; enabled?: boolean }) {
    const row = await this.keywords.update(id, patch);
    if (!row) throw ApiException.notFound('Keyword not found');
    await this.oplog.log({ adminId: actor.id, action: 'keyword.update', targetType: 'keyword', targetId: id, detail: patch as Record<string, unknown> });
    return row;
  }

  async deleteKeyword(actor: AuthUser, id: string) {
    const ok = await this.keywords.remove(id);
    if (!ok) throw ApiException.notFound('Keyword not found');
    await this.oplog.log({ adminId: actor.id, action: 'keyword.delete', targetType: 'keyword', targetId: id });
    return { deleted: true };
  }

  // ----------------------------------------------------------------- users ----

  async searchUsers(query: PageQuery & { role?: User['role']; status?: UserStatus; q?: string; program?: string; nationality?: string; sort?: string; order?: 'asc' | 'desc' }) {
    const [rows, total] = await this.usersSvc.search({ role: query.role, status: query.status, q: query.q, program: query.program, nationality: query.nationality, sort: query.sort, order: query.order, take: query.limit, skip: query.offset() });
    return offsetPage(rows.map((u) => this.userView(u)), query.page, query.limit, total);
  }

  /**
   * §6.17 admin provisioning — the one path that creates an account without the
   * §6.2 OTP handshake, so the admin owns the identity check. Mirrors register's
   * handle rules (a login handle is required; students need their student_id —
   * both are DB CHECKs) and its per-handle uniqueness probe, then starts the row
   * `active` with the temporary password. No verification timestamp is stamped:
   * nobody has proved they own the handle yet, and the person can change the
   * password themselves under Profile › Security.
   */
  async createUser(actor: AuthUser, dto: CreateUserDto) {
    // Granting platform authority stays a super-admin act, as with role flags.
    if ((dto.role === 'admin' || dto.role === 'admin_super') && actor.role !== 'admin_super') {
      throw ApiException.permissionDenied('Only super admins can create administrator accounts', { field: 'role' });
    }
    const name = dto.name?.trim();
    if (!name) throw ApiException.validationFailed([{ field: 'name', message: 'name is required' }]);

    const studentId = dto.student_id?.trim() || null;
    const phone = dto.phone?.trim() || null;
    const email = dto.email?.trim() || null;
    if (!studentId && !phone && !email) {
      throw ApiException.validationFailed([{ field: 'email', message: 'a student id, phone or email is required' }]);
    }
    if (dto.role === 'student' && !studentId) {
      throw ApiException.validationFailed([{ field: 'student_id', message: 'required for a student account' }]);
    }
    for (const [field, value] of [['student_id', studentId], ['phone', phone], ['email', email]] as const) {
      if (value && (await this.usersSvc.existsHandle(value))) {
        throw ApiException.conflict(`That ${field} is already registered`, 'handle_taken', { field });
      }
    }

    const user = await this.users.save(
      this.users.create({
        role: dto.role,
        name,
        student_id: studentId,
        phone,
        email,
        password_hash: hashPassword(dto.password),
        password_changed_at: new Date(),
        department_id: dto.department_id?.trim() || null,
        program: dto.program?.trim() || null,
        nationality: dto.nationality?.trim() || null,
        grade_year: dto.grade_year?.trim() || null,
        graduation_year: dto.graduation_year?.trim() || null,
        status: 'active',
      }),
    );
    await this.oplog.log({ adminId: actor.id, action: 'user.create', targetType: 'user', targetId: user.id, detail: { role: dto.role } });

    const fresh = await this.users.findOne({ where: { id: user.id }, relations: { department: true, avatar_media: true } });
    return this.userView(fresh ?? user);
  }

  async updateUserStatus(actor: AuthUser, id: string, status: UserStatus) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw ApiException.notFound('User not found');
    user.status = status;
    await this.users.save(user);
    await this.oplog.log({ adminId: actor.id, action: `user.${status}`, targetType: 'user', targetId: id });
    return this.userView(user);
  }

  /** §6.17 admin delete: reuses the §6.13 soft delete (status flip + PII scrub + deleted_at). */
  async deleteUser(actor: AuthUser, id: string) {
    if (id === actor.id) throw ApiException.conflict('You cannot delete your own account', 'self_delete');
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw ApiException.notFound('User not found');
    await this.usersSvc.softDelete(id);
    await this.oplog.log({ adminId: actor.id, action: 'user.delete', targetType: 'user', targetId: id });
    return { deleted: true };
  }

  /** §6.17 admin edit: update a user's profile details (status/role have their own flows). */
  async updateUser(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const user = await this.users.findOne({ where: { id }, relations: { department: true, avatar_media: true } });
    if (!user) throw ApiException.notFound('User not found');
    const edits: Partial<User> = {};
    if (dto.name !== undefined) edits.name = dto.name;
    if (dto.email !== undefined) edits.email = dto.email || null;
    if (dto.phone !== undefined) edits.phone = dto.phone || null;
    if (dto.student_id !== undefined) edits.student_id = dto.student_id || null;
    if (dto.department_id !== undefined) edits.department_id = dto.department_id || null;
    if (dto.program !== undefined) edits.program = dto.program || null;
    if (dto.nationality !== undefined) edits.nationality = dto.nationality || null;
    if (dto.grade_year !== undefined) edits.grade_year = dto.grade_year || null;
    if (dto.graduation_year !== undefined) edits.graduation_year = dto.graduation_year || null;
    if (dto.role !== undefined) edits.role = dto.role;
    await this.users.update({ id }, edits);
    const fresh = await this.users.findOne({ where: { id }, relations: { department: true, avatar_media: true } });
    await this.oplog.log({ adminId: actor.id, action: 'user.update', targetType: 'user', targetId: id, detail: edits as Record<string, unknown> });
    return this.userView(fresh ?? user);
  }

  // -------------------------------------------------------------- identity ----

  async convertUser(actor: AuthUser, id: string, dto: ConvertUserDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw ApiException.notFound('User not found');
    if (user.role !== 'student' && !dto.force) throw ApiException.conflict('User is not a student', 'not_convertible', { role: user.role });

    const from = user.role;
    user.role = 'graduate';
    if (dto.graduation_year) user.graduation_year = dto.graduation_year;
    else if (!user.graduation_year) user.graduation_year = String(new Date().getFullYear());
    await this.users.save(user);

    await this.identityLogs.save(
      this.identityLogs.create({ user_id: user.id, from_role: from, to_role: 'graduate', actor_id: actor.id, note: dto.force ? 'forced' : null }),
    );
    await this.notifications.notify({
      recipientId: user.id,
      type: 'identity_change',
      title: 'Your account is now a graduate account',
      body: 'Your role was converted from student to graduate.',
      payload: { targetType: 'user', targetId: user.id },
    });
    await this.oplog.log({ adminId: actor.id, action: 'user.convert', targetType: 'user', targetId: user.id, detail: { from, to: 'graduate' } });
    return this.userView(user);
  }

  async batchConvert(actor: AuthUser, dto: BatchConvertDto) {
    const results: Array<Record<string, unknown>> = [];
    for (const item of dto.items) {
      try {
        const view = await this.convertUser(actor, item.user_id, { graduation_year: item.graduation_year });
        results.push({ user_id: item.user_id, ok: true, role: view.role });
      } catch (e) {
        results.push({ user_id: item.user_id, ok: false, error: e instanceof ApiException ? e.code : 'failed' });
      }
    }
    return { results };
  }

  // ------------------------------------------------------- role strategies ----

  listRoleStrategies() {
    return this.roles.all();
  }

  async updateRoleStrategy(actor: AuthUser, dto: RoleStrategyUpdateDto) {
    const { role, ...flags } = dto;
    const saved = await this.roles.update(role, flags, actor.id);
    if (!saved) throw ApiException.notFound('Role strategy not found');
    await this.oplog.log({ adminId: actor.id, action: 'role_strategy.update', targetType: 'role_strategy', targetId: role, detail: flags as Record<string, unknown> });
    return saved;
  }

  // -------------------------------------------------------------- feedback ----

  /** §6.15/§6.17 admin feedback queue — newest first, optional status filter. */
  async feedbackQueue(query: PageQuery & { status?: 'open' | 'answered' | 'closed' }) {
    const qb = this.feedbacks
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.user', 'user')
      .orderBy('f.created_at', 'DESC')
      .take(query.limit)
      .skip(query.offset());
    if (query.status) qb.where('f.status = :status', { status: query.status });
    const [rows, total] = await qb.getManyAndCount();
    return offsetPage(rows.map((f) => this.feedbackView(f)), query.page, query.limit, total);
  }

  /**
   * §6.17 admin reply + lifecycle. A reply on an `open` thread auto-moves it to
   * `answered` (unless the admin closes it explicitly) and notifies the author.
   */
  async replyFeedback(actor: AuthUser, id: string, dto: { reply?: string; status?: 'open' | 'answered' | 'closed' }) {
    const fb = await this.feedbacks.findOne({ where: { id }, relations: { user: true } });
    if (!fb) throw ApiException.notFound('Feedback not found');
    const reply = dto.reply !== undefined ? dto.reply : fb.reply;
    const status = dto.status ?? (dto.reply && fb.status === 'open' ? 'answered' : fb.status);
    fb.reply = reply ?? null;
    fb.status = status;
    fb.handled_by = actor.id;
    fb.handled_at = new Date();
    await this.feedbacks.save(fb);
    if (dto.reply) {
      await this.notifications.notify({
        recipientId: fb.user_id,
        type: 'system',
        title: 'A response to your feedback',
        body: dto.reply,
        payload: { targetType: 'feedback', targetId: id },
      });
    }
    await this.oplog.log({ adminId: actor.id, action: 'feedback.reply', targetType: 'feedback', targetId: id, detail: { status } });
    return this.feedbackView(fb);
  }

  private feedbackView(f: Feedback) {
    return {
      id: f.id,
      content: f.content,
      reply: f.reply,
      status: f.status,
      created_at: f.created_at,
      handled_at: f.handled_at,
      user: f.user ? { id: f.user.id, name: f.user.name, role: f.user.role } : { id: f.user_id },
    };
  }

  // ----------------------------------------------------------------- stats ----

  async stats() {
    const now = Date.now();
    const since7 = new Date(now - 7 * 86400_000);
    const since1 = new Date(now - 86400_000);
    const [totalUsers, totalInfos, totalPosts, totalProfiles, pending, openReports] = await Promise.all([
      this.users.count({ where: { status: 'active' } }),
      this.infos.count(),
      this.posts.count(),
      this.alumni.count(),
      this.collectPending().then((i) => i.length),
      this.reportRepo.count({ where: { status: 'open' } }),
    ]);
    const oldest = await this.reportRepo.createQueryBuilder('r').where('r.status = :open', { open: 'open' }).orderBy('r.created_at', 'ASC').getOne();
    const dau = await this.users.createQueryBuilder('u').where('u.last_login_at >= :d', { d: since1 }).getCount();
    const wau = await this.users.createQueryBuilder('u').where('u.last_login_at >= :d', { d: since7 }).getCount();
    const signups7 = await this.users.createQueryBuilder('u').where('u.created_at >= :d', { d: since7 }).getCount();
    return {
      total_users: totalUsers,
      total_infos: totalInfos,
      total_posts: totalPosts,
      total_profiles: totalProfiles,
      pending_review: pending,
      open_reports: openReports,
      oldest_open_report_hours: oldest ? Math.max(0, Math.round((now - oldest.created_at.getTime()) / 3600_000)) : 0,
      dau,
      wau,
      signups_7d: signups7,
    };
  }

  // --------------------------------------------------------------- helpers ----

  private async collectPending(type?: ModerationTargetType): Promise<ReviewItem[]> {
    const want = (t: ModerationTargetType) => !type || type === t;
    const items: ReviewItem[] = [];

    if (want('info_post')) {
      const rows = await this.infos.find({ where: { status: 'pending' }, relations: { author: true }, order: { created_at: 'DESC' } });
      rows.forEach((r) => items.push({ target_type: 'info_post', target_id: r.id, title: r.title, submitted_at: r.created_at, author: this.authorBrief(r.author) }));
    }
    if (want('forum_post')) {
      const rows = await this.posts.find({ where: { status: 'pending' }, relations: { author: true }, order: { created_at: 'DESC' } });
      rows.forEach((r) => items.push({ target_type: 'forum_post', target_id: r.id, title: r.title, submitted_at: r.created_at, author: this.authorBrief(r.author) }));
    }
    if (want('comment')) {
      const rows = await this.comments.find({ where: { status: 'pending' }, relations: { author: true }, order: { created_at: 'DESC' } });
      rows.forEach((r) => items.push({ target_type: 'comment', target_id: r.id, title: r.content.slice(0, 80), submitted_at: r.created_at, author: this.authorBrief(r.author) }));
    }
    if (want('alumni_profile')) {
      const rows = await this.alumni.find({ where: { status: 'pending' }, relations: { user: true }, order: { created_at: 'DESC' } });
      rows.forEach((r) => items.push({ target_type: 'alumni_profile', target_id: r.id, title: r.display_name, submitted_at: r.created_at, author: this.authorBrief(r.user) }));
    }
    return items;
  }

  private async loadTarget(type: ModerationTargetType, id: string): Promise<{ authorId: string | null } | null> {
    switch (type) {
      case 'info_post': { const r = await this.infos.findOne({ where: { id } }); return r ? { authorId: r.author_id } : null; }
      case 'forum_post': { const r = await this.posts.findOne({ where: { id } }); return r ? { authorId: r.author_id } : null; }
      case 'comment': { const r = await this.comments.findOne({ where: { id } }); return r ? { authorId: r.author_id } : null; }
      case 'alumni_profile': { const r = await this.alumni.findOne({ where: { id } }); return r ? { authorId: r.user_id } : null; }
    }
  }

  /** alumni have no `taken_down`; that lifecycle state collapses to `rejected`. */
  private nextStatus(type: ModerationTargetType, action: 'approved' | 'rejected' | 'taken_down'): ContentStatus | ProfileStatus {
    if (type === 'alumni_profile') return action === 'approved' ? 'approved' : 'rejected';
    return action;
  }

  private async applyStatus(type: ModerationTargetType, id: string, status: ContentStatus | ProfileStatus, reason: string | null): Promise<void> {
    const patch = { status, ...(reason !== null ? { reject_reason: reason } : {}) };
    if (type === 'info_post') await this.infos.update({ id }, patch as never);
    else if (type === 'forum_post') await this.posts.update({ id }, patch as never);
    else if (type === 'comment') await this.comments.update({ id }, patch as never);
    else await this.alumni.update({ id }, patch as never);
  }

  private noun(type: ModerationTargetType): string {
    return { info_post: 'information post', forum_post: 'post', comment: 'comment', alumni_profile: 'profile' }[type];
  }

  private authorBrief(u?: User | null) {
    if (!u) return null;
    return { id: u.id, name: u.name, role: u.role };
  }

  private userView(u: User) {
    return serializeUser(u, { includeContact: true });
  }
}
