import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department, InfoPost } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { applyVisibility, canSeeInternal, visibleVisibilities } from '../../common/util/visibility';
import { bumpVersion } from '../../common/util/version';
import { ModerationService } from '../../moderation/services/moderation.service';
import { ReportService } from '../../moderation/services/report.service';
import { CreateInfoDto, InfoQueryDto, UpdateInfoDto } from '../dto/info.dto';

/** Reserved system account (§6.6) — official notices are attributed here. */
const SYSTEM_USER_ID = '1';

/**
 * §6.4 information board. Reads are visibility-scoped (§3.1) so a hidden or
 * taken-down info reads as `404`; writes funnel through the single §7 pipeline
 * (keyword scan → persist → `moderation_actions`). Admin posts publish as
 * `official` and skip review.
 */
@Injectable()
export class InfosService {
  constructor(
    @InjectRepository(InfoPost) private readonly infos: Repository<InfoPost>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    private readonly moderation: ModerationService,
    private readonly reports: ReportService,
  ) {}

  async feed(user: AuthUser, query: InfoQueryDto) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.infos
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.department', 'department')
      .leftJoinAndSelect('i.author', 'author')
      .leftJoinAndSelect('author.avatar_media', 'avatar')
      .where('i.status = :approved', { approved: 'approved' });
    applyVisibility(qb, 'i', user);
    if (query.category) qb.andWhere('i.category = :category', { category: query.category });
    if (query.source) qb.andWhere('i.source = :source', { source: query.source });
    if (!canSeeInternal(user)) qb.andWhere('i.category <> :internal', { internal: 'internal' });
    if (query.q) qb.andWhere('(i.title ILIKE :q OR i.content ILIKE :q)', { q: `%${query.q}%` });
    if (cursor?.v) qb.andWhere('i.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb
      .orderBy('i.pinned', 'DESC')
      .addOrderBy('i.created_at', 'DESC')
      .addOrderBy('i.id', 'DESC')
      .take(limit + 1)
      .getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.created_at.toISOString(), id: last.id }) : null;
    return cursorPage(rows.slice(0, limit).map((i) => this.row(i, false)), limit, next);
  }

  async findOne(user: AuthUser | null, id: string) {
    const i = await this.loadWithAuthor(id);
    this.assertReadable(i, user);
    return this.row(i, true);
  }

  async create(user: AuthUser, dto: CreateInfoDto) {
    const isAdmin = user.is_admin;
    const visibility = isAdmin ? dto.visibility ?? 'all' : dto.visibility === 'admin_only' ? 'all' : dto.visibility ?? 'all';
    const departmentId = await this.resolveDepartment(user, dto.department);

    let status: InfoPost['status'];
    let authorId: string;
    if (isAdmin) {
      status = 'approved';
      authorId = SYSTEM_USER_ID;
    } else {
      status = await this.moderation.scan([dto.title, dto.content]);
      authorId = user.id;
    }

    const saved = await this.infos.save(
      this.infos.create({
        title: dto.title,
        content: dto.content,
        category: dto.category,
        visibility,
        status,
        source: isAdmin ? 'official' : 'user',
        author_id: authorId,
        department_id: departmentId,
        pinned: isAdmin ? Boolean(dto.pinned) : false,
        approved_at: status === 'approved' ? new Date() : null,
      }),
    );

    await this.moderation.record({
      targetType: 'info_post',
      targetId: saved.id,
      actorId: user.id,
      action: isAdmin ? 'approved' : 'submitted',
    });

    return this.row(await this.loadWithAuthor(saved.id), true);
  }

  async update(user: AuthUser, id: string, dto: UpdateInfoDto, ifMatch?: string) {
    const i = await this.loadWithAuthor(id);
    if (!user.is_admin && i.author_id !== user.id) throw ApiException.permissionDenied('Not your info');

    const presented = dto.version ?? (ifMatch ? Number(ifMatch.replace(/"$/g, '').replace(/^"/g, '')) : undefined);
    this.assertEditable(i, presented);

    const textChanged = dto.title !== undefined || dto.content !== undefined;
    if (dto.title !== undefined) i.title = dto.title;
    if (dto.content !== undefined) i.content = dto.content;
    if (dto.category !== undefined) i.category = dto.category;
    if (dto.visibility !== undefined && (user.is_admin || dto.visibility !== 'admin_only')) i.visibility = dto.visibility;

    if (textChanged) {
      const scanned = await this.moderation.scan([i.title, i.content]);
      if (i.status === 'approved') i.edited_at = new Date(); // edit-after-approval ⇒ re-review path (§6.4)
      if (scanned === 'pending') {
        i.status = 'pending';
        i.reject_reason = null;
        await this.moderation.record({ targetType: 'info_post', targetId: i.id, actorId: user.id, action: 'resubmitted' });
      }
    }
    i.version = bumpVersion(i.version);
    await this.infos.save(i);
    return this.row(await this.loadWithAuthor(i.id), true);
  }

  /** Author (or admin) takedown → `taken_down`, never a hard delete (§6.4). */
  async remove(user: AuthUser, id: string) {
    const i = await this.infos.findOne({ where: { id } });
    if (!i) throw ApiException.notFound();
    if (!user.is_admin && i.author_id !== user.id) throw ApiException.permissionDenied('Not your info');
    if (i.status === 'taken_down') return { taken_down: true };
    i.status = 'taken_down';
    i.taken_down_at = new Date();
    await this.infos.save(i);
    await this.moderation.record({ targetType: 'info_post', targetId: i.id, actorId: user.id, action: 'taken_down' });
    return { taken_down: true };
  }

  /** `POST /infos/:id/report` alias for the generic report (§6.4). */
  report(user: AuthUser, id: string, reason: string) {
    return this.reports.create(user.id, { target_type: 'info_post', target_id: id, reason });
  }

  // ----------------------------------------------------------------- helpers --

  private async loadWithAuthor(id: string): Promise<InfoPost> {
    const i = await this.infos.findOne({
      where: { id },
      relations: { author: { avatar_media: true }, department: true },
    });
    if (!i) throw ApiException.notFound('Info not found');
    return i;
  }

  /** Existence never leaks across visibility/status boundaries (§5 404 rule). */
  private assertReadable(i: InfoPost, user: AuthUser | null) {
    const isOwnerOrAdmin = Boolean(user && (user.is_admin || user.id === i.author_id));
    if (i.status !== 'approved' && !isOwnerOrAdmin) throw ApiException.notFound('Info not found');
    if (!visibleVisibilities(user).includes(i.visibility)) throw ApiException.notFound('Info not found');
    if (i.category === 'internal' && !canSeeInternal(user)) throw ApiException.notFound('Info not found');
  }

  /** Only the author can edit while pending/rejected; approved is version-checked (§2). */
  private assertEditable(i: InfoPost, presented?: number) {
    if (i.status === 'taken_down') throw ApiException.notFound('Info not found');
    if (presented !== undefined && !Number.isNaN(presented) && presented !== i.version) {
      throw ApiException.versionConflict(`Info is at version ${i.version}, request assumed ${presented}`);
    }
  }

  private async resolveDepartment(user: AuthUser, raw?: string): Promise<string | null> {
    if (!raw) return user.department_id ?? null;
    const dept = /^\d+$/.test(raw)
      ? await this.departments.findOne({ where: { id: raw } })
      : await this.departments.findOne({ where: { code: raw } });
    if (!dept) throw ApiException.validationFailed([{ field: 'department', message: 'unknown department' }]);
    return dept.id;
  }

  private row(i: InfoPost, full: boolean) {
    const author = (i as any).author;
    return {
      id: i.id,
      title: i.title,
      category: i.category,
      source: i.source,
      visibility: i.visibility,
      status: i.status,
      pinned: i.pinned,
      department_id: i.department_id,
      department: i.department ? { id: i.department.id, code: i.department.code, name_zh: i.department.name_zh, name_en: i.department.name_en } : null,
      author: author ? { id: author.id, name: author.name, role: author.role, avatar_url: author.avatar_media?.url ?? null } : null,
      reject_reason: i.reject_reason,
      edited_at: i.edited_at,
      version: i.version,
      created_at: i.created_at,
      ...(full ? { content: i.content } : {}),
    };
  }
}
