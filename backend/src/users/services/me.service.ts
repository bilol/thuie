import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Comment, Department, ForumPost, InfoPost, NotificationPreference, PushToken, User,
} from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { NotificationType } from '../../common/auth.types';
import { cursorPage } from '../../common/pagination/page';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { serializeUser } from '../../common/serializers/user.serializer';
import { RoleService } from '../../auth/services/role.service';
import { TokenService } from '../../auth/services/token.service';
import { UpdateMeDto } from '../dto/me.dto';

/**
 * §6.2 "Users / me" — the caller's own world: profile, effective role strategy,
 * device sessions, push tokens, mute preferences and the My-Infos / My-Posts /
 * My-Comments lists that show **all** statuses (including pending/rejected,
 * which the public feeds hide).
 */
@Injectable()
export class MeService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(InfoPost) private readonly infos: Repository<InfoPost>,
    @InjectRepository(ForumPost) private readonly posts: Repository<ForumPost>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(PushToken) private readonly pushTokens: Repository<PushToken>,
    @InjectRepository(NotificationPreference) private readonly prefs: Repository<NotificationPreference>,
    private readonly roles: RoleService,
    private readonly tokens: TokenService,
  ) {}

  async me(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: { department: true, avatar_media: true, alumni_profile: true },
    });
    if (!user) throw ApiException.notFound('Account not found');
    const profile = serializeUser(user, { includeContact: true });
    return {
      ...profile,
      profile_completion: this.completion(user),
      has_alumni_profile: Boolean(user.alumni_profile),
      alumni_profile_status: user.alumni_profile?.status ?? null,
    };
  }

  /** 0-100 hint mirroring the client's "complete your profile" checklist. */
  private completion(user: User): { percent: number; missing: string[] } {
    const checks: Array<[string, boolean]> = [
      ['name', Boolean(user.name)],
      ['bio', Boolean(user.bio?.trim())],
      ['avatar', Boolean(user.avatar_media_id)],
      ['department', Boolean(user.department_id)],
      [user.role === 'student' ? 'grade_year' : 'graduation_year', Boolean(user.role === 'student' ? user.grade_year : user.graduation_year)],
      ['alumni_profile', Boolean(user.alumni_profile && user.alumni_profile.status !== 'draft')],
    ];
    const done = checks.filter(([, ok]) => ok).length;
    return {
      percent: Math.round((done / checks.length) * 100),
      missing: checks.filter(([, ok]) => !ok).map(([key]) => key),
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.users.findOne({ where: { id: userId }, relations: { department: true, avatar_media: true } });
    if (!user) throw ApiException.notFound();

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.grade_year !== undefined) user.grade_year = dto.grade_year;
    if (dto.avatar_media_id !== undefined) user.avatar_media_id = dto.avatar_media_id || null;
    if (dto.wechat !== undefined) user.wechat = dto.wechat || null;
    if (dto.whatsapp !== undefined) user.whatsapp = dto.whatsapp || null;
    if (dto.linkedin !== undefined) user.linkedin = dto.linkedin || null;
    if (dto.wechat_visibility !== undefined) user.wechat_visibility = dto.wechat_visibility;
    if (dto.whatsapp_visibility !== undefined) user.whatsapp_visibility = dto.whatsapp_visibility;
    if (dto.linkedin_visibility !== undefined) user.linkedin_visibility = dto.linkedin_visibility;
    if (dto.email_visibility !== undefined) user.email_visibility = dto.email_visibility;
    if (dto.phone_visibility !== undefined) user.phone_visibility = dto.phone_visibility;

    // Students cannot self-promote to graduate: conversion is an admin action
    // (§6.17 /admin/users/:id/convert).
    if (dto.graduation_year !== undefined) {
      if (user.role === 'student') throw ApiException.permissionDenied('Student→graduate conversion is an admin action');
      user.graduation_year = dto.graduation_year;
    }
    if (dto.department !== undefined) {
      const dept = dto.department
        ? await this.departments.findOne({ where: /^\d+$/.test(dto.department) ? { id: dto.department } : { code: dto.department } })
        : null;
      if (dto.department && !dept) throw ApiException.validationFailed([{ field: 'department', message: 'unknown department' }]);
      user.department_id = dept?.id ?? null;
      user.department = dept ?? null;
    }

    await this.users.save(user);
    return this.me(userId);
  }

  /** §6.2 — the client gates its whole navigation off this response. */
  async roleStrategy(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw ApiException.notFound();
    const strategy = await this.roles.forRole(user.role);
    if (user.is_admin) {
      return { role: user.role, can_view_info: true, can_view_internal: true, can_view_alumni: true, can_view_forum: true, can_submit_info: true, can_post_forum: true, can_comment: true, can_create_profile: true };
    }
    return { role: user.role, ...(strategy?.toClientShape() ?? {}) };
  }

  // ------------------------------------------------------------ sessions ---

  async sessions(userId: string) {
    const rows = await this.tokens.listSessions(userId);
    return this.tokens.sessionView(rows);
  }

  async revokeSession(userId: string, sessionId: string) {
    const ok = await this.tokens.revokeSession(userId, sessionId);
    if (!ok) throw ApiException.notFound('Session not found or already revoked');
    return { revoked: true };
  }

  /** "Sign out everywhere else": keep the calling family, revoke the rest. */
  async revokeOtherSessions(userId: string, keepFamilyId?: string) {
    await this.tokens.revokeAllForUser(userId, keepFamilyId);
    return { revoked: true };
  }

  // ----------------------------------------------------------- push tokens ---

  async registerPushToken(userId: string, token: string, platform: 'ios' | 'android') {
    // Rotating the same token refreshes it; a device never holds >1 live row.
    const existing = await this.pushTokens.findOne({ where: { user_id: userId, token } });
    if (existing) {
      existing.platform = platform;
      existing.revoked_at = null;
      await this.pushTokens.save(existing);
      return { registered: true, id: existing.id };
    }
    // Per-user cap (§9.1) stops multi-account fan-out storms.
    const live = await this.pushTokens.count({ where: { user_id: userId, revoked_at: IsNull() } });
    if (live >= 5) throw ApiException.conflict('Too many devices registered for this account', 'device_limit');
    const row = await this.pushTokens.save(this.pushTokens.create({ user_id: userId, token, platform }));
    return { registered: true, id: row.id };
  }

  async unregisterPushToken(userId: string, token?: string) {
    if (token) {
      await this.pushTokens.update({ user_id: userId, token }, { revoked_at: new Date() });
      return { revoked: true };
    }
    await this.pushTokens.update({ user_id: userId, revoked_at: IsNull() }, { revoked_at: new Date() });
    return { revoked: true, all: true };
  }

  // ------------------------------------------------------- my own content ---

  /** §6.2 own infos across all statuses, newest first. */
  async myInfos(userId: string, query: { cursor?: string; limit?: number; status?: string }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.infos
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.department', 'department')
      .where('i.author_id = :userId', { userId });
    if (query.status) qb.andWhere('i.status = :status', { status: query.status });
    if (cursor?.v) qb.andWhere('i.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb.orderBy('i.created_at', 'DESC').addOrderBy('i.id', 'DESC').take(limit + 1).getMany();
    const next = rows.length > limit ? encodeCursor({ v: rows[limit - 1].created_at.toISOString(), id: rows[limit - 1].id }) : null;
    return cursorPage(rows.slice(0, limit).map((r) => this.infoRow(r)), limit, next);
  }

  /** §6.2 own forum posts across all statuses. */
  async myPosts(userId: string, query: { cursor?: string; limit?: number; status?: string }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.posts.createQueryBuilder('p').where('p.author_id = :userId', { userId });
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (cursor?.v) qb.andWhere('p.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb.orderBy('p.created_at', 'DESC').addOrderBy('p.id', 'DESC').take(limit + 1).getMany();
    const next = rows.length > limit ? encodeCursor({ v: rows[limit - 1].created_at.toISOString(), id: rows[limit - 1].id }) : null;
    return cursorPage(
      rows.slice(0, limit).map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        reject_reason: p.reject_reason,
        comment_count: p.comment_count,
        view_count: p.view_count,
        like_count: p.like_count,
        bookmark_count: p.bookmark_count,
        edited_at: p.edited_at,
        version: p.version,
        created_at: p.created_at,
      })),
      limit,
      next,
    );
  }

  /** §6.2 own comments (thread title travels with them for the My Posts UI). */
  async myComments(userId: string, query: { cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.comments
      .createQueryBuilder('c')
      .leftJoin('forum_posts', 'p', 'p.id = c.forum_post_id')
      .addSelect('p.title', 'post_title')
      .where('c.author_id = :userId', { userId })
      .andWhere('c.status <> :taken', { taken: 'taken_down' });
    if (cursor?.id) qb.andWhere('c.id < :id', { id: String(cursor.id) });
    const raw = await qb.orderBy('c.id', 'DESC').take(limit + 1).getRawAndEntities();
    const rows = raw.entities.slice(0, limit);
    const titles = raw.raw as Array<{ c_id: string; post_title: string }>;
    const next = raw.entities.length > limit ? encodeCursor({ id: rows[rows.length - 1].id }) : null;
    return cursorPage(
      rows.map((c) => ({
        id: c.id,
        content: c.content,
        status: c.status,
        forum_post_id: c.forum_post_id,
        post_title: titles.find((t) => String(t.c_id) === String(c.id))?.post_title ?? null,
        created_at: c.created_at,
      })),
      limit,
      next,
    );
  }

  private infoRow(i: InfoPost) {
    return {
      id: i.id,
      title: i.title,
      category: i.category,
      source: i.source,
      visibility: i.visibility,
      status: i.status,
      reject_reason: i.reject_reason,
      pinned: i.pinned,
      department_id: i.department_id,
      edited_at: i.edited_at,
      version: i.version,
      created_at: i.created_at,
    };
  }

  // ------------------------------------------------ notification prefs ----

  /** §6.2/§12.6 — every type is listed, defaulting to unmuted. */
  async notificationPreferences(userId: string) {
    const rows = await this.prefs.find({ where: { user_id: userId } });
    const known: NotificationType[] = [
      'review_result', 'comment_reply', 'connection', 'system', 'report_result', 'identity_change', 'broadcast',
    ];
    return known.map((type) => ({
      type,
      muted: rows.find((r) => r.type === type)?.muted ?? false,
    }));
  }

  async setNotificationPreference(userId: string, type: NotificationType, muted: boolean) {
    const existing = await this.prefs.findOne({ where: { user_id: userId, type } });
    if (existing) {
      existing.muted = muted;
      existing.updated_at = new Date();
      await this.prefs.save(existing);
    } else {
      await this.prefs.save(this.prefs.create({ user_id: userId, type, muted, updated_at: new Date() }));
    }
    return { type, muted };
  }

  // ------------------------------------------------------------ deletion ---

  /** §6.13 soft delete + sign-out; the PII scrub runs in the nightly job. */
  async deleteAccount(userId: string) {
    await this.users.update(
      { id: userId },
      { status: 'deleted', deleted_at: new Date(), student_id: null, phone: null, email: null, wechat: null, whatsapp: null, linkedin: null, password_hash: null },
    );
    await this.tokens.revokeAllForUser(userId);
    await this.pushTokens.update({ user_id: userId, revoked_at: IsNull() }, { revoked_at: new Date() });
    return { deleted: true };
  }
}
