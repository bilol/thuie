import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AlumniProfile, Connection, Department, ProfileSkill, User } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { ProfileStatus, Visibility } from '../../common/auth.types';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { applyVisibility } from '../../common/util/visibility';
import { bumpVersion } from '../../common/util/version';
import { ModerationService } from '../../moderation/services/moderation.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  CreateAlumniProfileDto, AlumniQueryDto, UpdateAlumniProfileDto, VisibilityRequestDto,
} from '../dto/alumni.dto';

/** Directory field checklist that drives `completion_percent` (§6.5, computed in-API). */
const COMPLETION_FIELDS: Array<[string, (p: AlumniProfile, skills: string[]) => boolean]> = [
  ['display_name', (p) => Boolean(p.display_name)],
  ['department', (p) => Boolean(p.user?.department_id ?? p.department_id)],
  ['graduation_year', (p) => Boolean(p.user?.graduation_year ?? p.graduation_year)],
  ['program', (p) => Boolean(p.user?.program)],
  ['work_title', (p) => Boolean(p.work_title)],
  ['company', (p) => Boolean(p.company)],
  ['industry', (p) => Boolean(p.industry)],
  ['city', (p) => Boolean(p.city)],
  ['bio', (p) => Boolean(p.bio?.trim())],
  ['avatar', (p) => Boolean(p.avatar_media_id)],
  ['skills', (_p, s) => s.length > 0],
];

/**
 * §6.5 alumni directory. Browse/detail are visibility-scoped (§3.1) and only
 * surface `approved` rows to other viewers; contact values are gated behind each
 * field's `*_visibility` + viewer role, never leaked in the list (§3.1). Own-profile
 * writes funnel through the §7 moderation pipeline like infos.
 */
@Injectable()
export class AlumniService {
  constructor(
    @InjectRepository(AlumniProfile) private readonly profiles: Repository<AlumniProfile>,
    @InjectRepository(ProfileSkill) private readonly skills: Repository<ProfileSkill>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Connection) private readonly connections: Repository<Connection>,
    private readonly moderation: ModerationService,
    private readonly presence: RealtimeGateway,
  ) {}

  // -------------------------------------------------------------- public browse --

  async browse(user: AuthUser, query: AlumniQueryDto) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.profiles
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.department', 'department')
      .leftJoinAndSelect('a.avatar_media', 'avatar')
      // Program now lives on the owning user; joined so `view()` can surface it.
      .leftJoinAndSelect('a.user', 'owner')
      // The owning user is the source of truth for department / graduation year,
      // so join their department too and filter on the effective (user-first) value.
      .leftJoinAndSelect('owner.department', 'owner_department')
      .where('a.status = :approved', { approved: 'approved' });
    applyVisibility(qb, 'a', user);
    if (query.department) {
      const deptId = await this.departmentId(query.department);
      qb.andWhere('COALESCE(owner.department_id, a.department_id) = :deptId', { deptId });
    }
    if (query.graduation_year) qb.andWhere('COALESCE(owner.graduation_year, a.graduation_year) = :gy', { gy: query.graduation_year });
    if (query.company) qb.andWhere('a.company ILIKE :company', { company: `%${query.company}%` });
    // Program is an exact, case-insensitive match (no wildcards): a substring test
    // would let 'MEM' wrongly match 'IMEM'.
    if (query.program) qb.andWhere('owner.program ILIKE :program', { program: query.program });
    if (query.country) qb.andWhere('a.country ILIKE :country', { country: `%${query.country}%` });
    if (query.q) qb.andWhere('(a.display_name ILIKE :q OR a.company ILIKE :q OR a.work_title ILIKE :q OR a.bio ILIKE :q)', { q: `%${query.q}%` });
    if (query.skill) {
      const skillIds = await this.skillProfileIds(query.skill);
      if (skillIds.length === 0) return cursorPage([], limit, null);
      qb.andWhere('a.id IN (:...skillIds)', { skillIds });
    }
    if (cursor?.v) qb.andWhere('(a.updated_at, a.id) < (:cv, :cid)', { cv: new Date(String(cursor.v)), cid: String(cursor.id ?? '0') });
    const rows = await qb
      .orderBy('COALESCE(a.updated_at, a.created_at)', 'DESC')
      .addOrderBy('a.id', 'DESC')
      // `.limit` not `.take`: the distinct-ids subquery cannot resolve the
      // raw COALESCE expression used as an order term.
      .limit(limit + 1)
      .getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: (last.updated_at ?? last.created_at).toISOString(), id: last.id }) : null;
    const page = rows.slice(0, limit);
    // One batched query decorates the whole page with the viewer's pair state,
    // so cards can show sent/connected and offer cancel without a per-card 409.
    const peerIds = page.map((a) => a.user_id).filter((uid): uid is string => !!uid && uid !== user.id);
    const rels = await this.relationships(user.id, peerIds);
    return cursorPage(
      page.map((a) => this.view(a, { connection: (a.user_id && rels.get(a.user_id)) || null })),
      limit,
      next,
    );
  }

  async detail(user: AuthUser, id: string) {
    const a = await this.load(id);
    const isOwner = a.user_id === user.id;
    if (a.status !== 'approved' && !(isOwner || user.is_admin)) throw ApiException.notFound('Profile not found');
    if (!this.canSee(user, a)) throw ApiException.notFound('Profile not found');
    const skills = await this.skillsFor(id);
    // Viewer relationship — lets the detail UI gate the Connect action (a stale
    // button otherwise re-POSTs and 409s on the pending request).
    const rel = a.user_id && !isOwner ? (await this.relationships(user.id, [a.user_id])).get(a.user_id) ?? null : null;
    return this.view(a, { full: true, skills, isOwner, viewer: user, connection: rel });
  }

  /** First-degree connections for a profile's owner (§6.5). */
  async connectionsFor(user: AuthUser, id: string) {
    const a = await this.load(id);
    if (!a.user_id) return { data: [] };
    if (a.status !== 'approved' && a.user_id !== user.id && !user.is_admin) throw ApiException.notFound('Profile not found');
    const accepted = await this.connections
      .createQueryBuilder('c')
      .where('(c.from_user_id = :uid OR c.to_user_id = :uid)', { uid: a.user_id })
      .andWhere("c.status = 'accepted'")
      .getMany();
    const peerIds = accepted.map((c) => (c.from_user_id === a.user_id ? c.to_user_id : c.from_user_id));
    if (peerIds.length === 0) return { data: [] };
    const users = await this.profiles.manager.getRepository(User).find({
      where: peerIds.map((pid) => ({ id: pid })),
      relations: { avatar_media: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const data = peerIds
      .map((pid) => byId.get(pid))
      .filter((u): u is User => Boolean(u))
      .map((u) => ({ user_id: u.id, name: u.name, role: u.role, avatar_url: u.avatar_media?.url ?? null }));
    return { data };
  }

  // -------------------------------------------------------------- own profile --

  async own(user: AuthUser) {
    const a = await this.profiles.findOne({
      where: { user_id: user.id },
      relations: { department: true, avatar_media: true, skills: true, user: { department: true } },
    });
    if (!a) return null;
    const skills = (a.skills ?? []).map((s) => s.skill);
    return this.view(a, { full: true, skills, includeReject: true, isOwner: true, viewer: user });
  }

  async create(user: AuthUser, dto: CreateAlumniProfileDto) {
    const existing = await this.profiles.findOne({ where: { user_id: user.id } });
    if (existing) throw ApiException.conflict('You already have an alumni profile', 'profile_exists', { profile_id: existing.id });
    const departmentId = await this.resolveDepartment(user, dto.department);
    const status = await this.moderation.scan([dto.display_name, dto.bio, dto.company, dto.work_title]);
    const saved = await this.profiles.save(
      this.profiles.create({
        user_id: user.id,
        display_name: dto.display_name,
        industry: dto.industry ?? null,
        country: dto.country ?? null,
        city: dto.city ?? null,
        work_title: dto.work_title ?? null,
        company: dto.company ?? null,
        bio: dto.bio ?? null,
        avatar_media_id: dto.avatar_media_id ?? null,
        visibility: (dto.visibility ?? 'all') as Visibility,
        source: 'user',
        status: status as ProfileStatus,
      }),
    );
    await this.moderation.record({ targetType: 'alumni_profile', targetId: saved.id, actorId: user.id, action: 'submitted' });
    // Person facts (program, nationality, department, grade/graduation year) live
    // on the owning user, not the directory row (§6.5). Write the ones provided.
    const createEdits: Partial<User> = {};
    if (dto.program !== undefined) createEdits.program = dto.program || null;
    if (dto.nationality !== undefined) createEdits.nationality = dto.nationality || null;
    if (dto.department !== undefined) createEdits.department_id = departmentId || null;
    if (dto.graduation_year !== undefined) createEdits.graduation_year = dto.graduation_year || null;
    if (dto.grade_year !== undefined) createEdits.grade_year = dto.grade_year || null;
    if (Object.keys(createEdits).length) {
      await this.profiles.manager.getRepository(User).update({ id: user.id }, createEdits);
    }
    return this.reload(user, saved.id);
  }

  async update(user: AuthUser, dto: UpdateAlumniProfileDto, ifMatch?: string) {
    const a = await this.byUser(user.id);
    const presented = dto.version ?? (ifMatch ? Number(ifMatch.replace(/"/g, '')) : undefined);
    if (presented !== undefined && !Number.isNaN(presented) && presented !== a.version) {
      throw ApiException.versionConflict(`Profile is at version ${a.version}, request assumed ${presented}`);
    }

    const scalar: Array<keyof UpdateAlumniProfileDto> = [
      'display_name', 'industry', 'country', 'city',
      'work_title', 'company', 'bio',
    ];
    for (const key of scalar) {
      const value = dto[key];
      if (value !== undefined) (a as any)[key] = value === '' ? null : value;
    }
    if (dto.visibility !== undefined) a.visibility = dto.visibility;
    if (dto.avatar_media_id !== undefined) a.avatar_media_id = dto.avatar_media_id || null;
    // Person facts (program, nationality, department, grade/graduation year) live
    // on the owning user (§6.5) — route those writes there, outside the directory row.
    const updateEdits: Partial<User> = {};
    if (dto.program !== undefined) updateEdits.program = dto.program === '' ? null : dto.program;
    if (dto.nationality !== undefined) updateEdits.nationality = dto.nationality === '' ? null : dto.nationality;
    if (dto.graduation_year !== undefined) updateEdits.graduation_year = dto.graduation_year === '' ? null : dto.graduation_year;
    if (dto.grade_year !== undefined) updateEdits.grade_year = dto.grade_year === '' ? null : dto.grade_year;
    if (dto.department !== undefined) updateEdits.department_id = await this.resolveDepartment(user, dto.department);
    if (Object.keys(updateEdits).length) {
      await this.profiles.manager.getRepository(User).update({ id: user.id }, updateEdits);
    }

    const textChanged = dto.display_name !== undefined || dto.bio !== undefined || dto.company !== undefined || dto.work_title !== undefined;
    if (textChanged) {
      const scanned = await this.moderation.scan([a.display_name, a.bio, a.company, a.work_title]);
      if (scanned === 'pending') {
        a.status = 'pending';
        a.reject_reason = null;
        await this.moderation.record({ targetType: 'alumni_profile', targetId: a.id, actorId: user.id, action: 'resubmitted' });
      }
    }
    a.version = bumpVersion(a.version);
    await this.profiles.save(a);
    return this.reload(user, a.id);
  }

  /** §6.5 `PUT /me/alumni-profile/skills` — idempotent full-list replacement. */
  async setSkills(user: AuthUser, list: string[]) {
    const a = await this.byUser(user.id);
    const cleaned = Array.from(new Set(list.map((s) => s.trim()).filter(Boolean))).slice(0, 30);
    await this.profiles.manager.transaction(async (m: EntityManager) => {
      const repo = m.getRepository(ProfileSkill);
      await repo.delete({ alumni_profile_id: a.id });
      if (cleaned.length) {
        await repo.save(cleaned.map((skill) => repo.create({ alumni_profile_id: a.id, skill })));
      }
    });
    return this.reload(user, a.id);
  }

  /**
   * §6.5 visibility request: change a published profile's visibility/contact and
   * resubmit it for admin review (reuses the §7 pending path rather than adding
   * a one-off queue table).
   */
  async requestVisibility(user: AuthUser, dto: VisibilityRequestDto) {
    const a = await this.byUser(user.id);
    if (dto.visibility !== undefined) a.visibility = dto.visibility;
    a.status = 'pending';
    a.version = bumpVersion(a.version);
    await this.profiles.save(a);
    await this.moderation.record({ targetType: 'alumni_profile', targetId: a.id, actorId: user.id, action: 'resubmitted', reason: 'visibility_request' });
    return this.reload(user, a.id);
  }

  // ------------------------------------------------------------------ helpers --

  /**
   * Active pair state (pending/accepted) between the viewer and each peer id —
   * keyed by peer user id. `sent` = viewer asked, `incoming` = peer asked.
   */
  private async relationships(
    viewerId: string,
    peerIds: string[],
  ): Promise<Map<string, { id: string; status: 'connected' | 'sent' | 'incoming' }>> {
    const map = new Map<string, { id: string; status: 'connected' | 'sent' | 'incoming' }>();
    if (peerIds.length === 0) return map;
    const rows = await this.connections
      .createQueryBuilder('c')
      .where('((c.from_user_id = :me AND c.to_user_id IN (:...peers)) OR (c.from_user_id IN (:...peers) AND c.to_user_id = :me))', { me: viewerId, peers: peerIds })
      .andWhere("c.status IN ('pending','accepted')")
      .getMany();
    for (const c of rows) {
      const peer = c.from_user_id === viewerId ? c.to_user_id : c.from_user_id;
      const status = c.status === 'accepted' ? 'connected' : c.from_user_id === viewerId ? 'sent' : 'incoming';
      map.set(String(peer), { id: c.id, status });
    }
    return map;
  }

  private async reload(user: AuthUser, id: string) {
    const a = await this.load(id);
    const skills = await this.skillsFor(id);
    return this.view(a, { full: true, skills, includeReject: true, isOwner: true, viewer: user });
  }

  private async byUser(userId: string): Promise<AlumniProfile> {
    const a = await this.profiles.findOne({ where: { user_id: userId } });
    if (!a) throw ApiException.notFound('You do not have an alumni profile yet');
    return a;
  }

  private async load(id: string): Promise<AlumniProfile> {
    let a = await this.profiles.findOne({
      where: { id },
      relations: { department: true, avatar_media: true, user: { department: true } },
    });
    // Content surfaces (e.g. a forum post) only carry the author's *user* id, so
    // `/alumni/:id` also resolves by owner. Profile-id lookup is tried first, so
    // existing directory links are unaffected.
    if (!a) {
      a = await this.profiles.findOne({
        where: { user_id: id },
        relations: { department: true, avatar_media: true, user: { department: true } },
      });
    }
    if (!a) throw ApiException.notFound('Profile not found');
    return a;
  }

  private canSee(user: AuthUser, a: AlumniProfile): boolean {
    if (a.user_id === user.id || user.is_admin) return true;
    if (a.visibility === 'admin_only') return false;
    if (a.visibility === 'student_only') return user.role === 'student';
    return true;
  }

  private async skillsFor(profileId: string): Promise<string[]> {
    const rows = await this.skills.find({ where: { alumni_profile_id: profileId } });
    return rows.map((r) => r.skill);
  }

  private async skillProfileIds(skill: string): Promise<string[]> {
    const rows = await this.skills.createQueryBuilder('s').select('s.alumni_profile_id', 'id').where('s.skill ILIKE :skill', { skill: `%${skill}%` }).getRawMany();
    return rows.map((r) => String(r.id));
  }

  private async departmentId(raw: string): Promise<string> {
    const dept = /^\d+$/.test(raw)
      ? await this.departments.findOne({ where: { id: raw } })
      : await this.departments.findOne({ where: { code: raw } });
    if (!dept) throw ApiException.validationFailed([{ field: 'department', message: 'unknown department' }]);
    return dept.id;
  }

  private async resolveDepartment(user: AuthUser, raw?: string): Promise<string | null> {
    if (!raw) return user.department_id ?? null;
    return this.departmentId(raw);
  }

  private view(
    a: AlumniProfile,
    opts: { full?: boolean; skills?: string[]; includeReject?: boolean; viewer?: AuthUser; isOwner?: boolean; connection?: { id: string; status: 'connected' | 'sent' | 'incoming' } | null } = {},
  ) {
    const skills = opts.skills ?? [];
    // Person/academic facts live on the owning user; the profile's own columns
    // are authoritative only for school-official rows (user_id NULL).
    const owner = a.user;
    const effDept = owner?.department ?? a.department;
    const { percent, missing } = this.completion(a, skills);
    const base: Record<string, unknown> = {
      id: a.id,
      user_id: a.user_id,
      display_name: a.display_name,
      department: effDept ? { id: effDept.id, code: effDept.code, name_zh: effDept.name_zh, name_en: effDept.name_en } : null,
      department_id: owner?.department_id ?? a.department_id,
      graduation_year: owner?.graduation_year ?? a.graduation_year,
      grade_year: owner?.grade_year ?? a.grade_year,
      program: owner?.program ?? null,
      industry: a.industry,
      country: a.country,
      city: a.city,
      nationality: owner?.nationality ?? a.nationality,
      work_title: a.work_title,
      company: a.company,
      avatar_url: a.avatar_media?.url ?? null,
      // Live presence from the gateway's in-memory socket map (a snapshot at query
      // time). Official SCHOOL-source profiles have no account, so no presence.
      is_online: a.user_id ? this.presence.isOnline(a.user_id) : false,
      visibility: a.visibility,
      source: a.source,
      completion_percent: percent,
      missing,
      connection_status: opts.connection?.status ?? null,
      // Canceling a sent request needs the connection row id (PATCH revoked).
      connection_id: opts.connection?.id ?? null,
    };
    if (opts.full) {
      base.bio = a.bio;
      // Per-field publication of contact channels (§3.1): email/phone handles +
      // social handles and their visibility all live on the owning user (§6.5),
      // so their audiences are served by GET /me; the directory view only surfaces
      // the value — to the owner/admins or when that field's audience is 'all'.
      const allow = (v: Visibility) => opts.isOwner || opts.viewer?.is_admin || v === 'all';
      if (allow(owner?.email_visibility ?? 'admin_only')) base.email = owner?.email ?? null;
      if (allow(owner?.phone_visibility ?? 'admin_only')) base.phone = owner?.phone ?? null;
      if (allow(owner?.wechat_visibility ?? 'admin_only')) base.wechat = owner?.wechat ?? null;
      if (allow(owner?.whatsapp_visibility ?? 'admin_only')) base.whatsapp = owner?.whatsapp ?? null;
      if (allow(owner?.linkedin_visibility ?? 'admin_only')) base.linkedin = owner?.linkedin ?? null;
    }
    if (opts.skills) base.skills = skills;
    if (opts.includeReject) {
      base.status = a.status;
      base.reject_reason = a.reject_reason;
      base.version = a.version;
      base.updated_at = a.updated_at;
    }
    return base;
  }

  private completion(a: AlumniProfile, skills: string[]): { percent: number; missing: string[] } {
    const done = COMPLETION_FIELDS.filter(([, fn]) => fn(a, skills));
    const missing = COMPLETION_FIELDS.filter(([, fn]) => !fn(a, skills)).map(([key]) => key);
    return { percent: Math.round((done.length / COMPLETION_FIELDS.length) * 100), missing };
  }
}
