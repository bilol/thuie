import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department, FacultyMember } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage, offsetPage } from '../../common/pagination/page';
import { CreateFacultyDto, FacultyAdminQueryDto, FacultyQueryDto, UpdateFacultyDto } from '../dto/faculty.dto';

/**
 * §6.6 faculty directory — admin-maintained, no account link, no moderation
 * (it is official data). Reads are open to any authenticated viewer; writes set
 * the `updated_by` audit column so §6.17 operation logs can attribute changes.
 */
@Injectable()
export class FacultyService {
  constructor(
    @InjectRepository(FacultyMember) private readonly faculty: Repository<FacultyMember>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
  ) {}

  /** Shared WHERE clause for both paged reads (§6.6): department + free text. */
  private async filtered(query: { department?: string; q?: string }) {
    const qb = this.faculty
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.department', 'department')
      .leftJoinAndSelect('f.avatar_media', 'avatar');
    if (query.department) {
      const deptId = await this.departmentId(query.department);
      qb.andWhere('f.department_id = :deptId', { deptId });
    }
    if (query.q) qb.andWhere('(f.name ILIKE :q OR f.title ILIKE :q OR f.research_area ILIKE :q)', { q: `%${query.q}%` });
    return qb;
  }

  /** §6.6 public directory browse, alphabetical, cursor envelope (§4) — the one
   *  shape every `/faculty` caller uses: mobile's `PaginatedNotifier` feed and the
   *  web directory's "load more". (Admin tables get offset via [listAdmin].) */
  async browse(query: FacultyQueryDto) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = await this.filtered(query);
    // The keyset has to be the ORDER BY key. It used to compare (created_at, id)
    // with `<` while sorting name ASC — a different column *and* direction, so
    // every page after the first dropped or repeated rows.
    if (cursor?.v != null) {
      // `'0'` fallback: the id is compared as a bigint, so an empty string 500s.
      qb.andWhere('(f.name, f.id) > (:nv, :cid)', { nv: String(cursor.v), cid: String(cursor.id ?? '0') });
    }
    const rows = await qb.orderBy('f.name', 'ASC').addOrderBy('f.id', 'ASC').take(limit + 1).getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.name, id: last.id }) : null;
    return cursorPage(rows.slice(0, limit).map((f) => this.view(f)), limit, next);
  }

  async detail(id: string) {
    return this.view(await this.load(id));
  }

  /**
   * §6.6 admin console list — offset pagination (page/limit + total), the same
   * shape `AdminUsersController` returns so the table footer can share the
   * `Pagination` control. Sort is whitelisted (name / title) to keep the client
   * from ordering by an arbitrary column.
   */
  async listAdmin(query: FacultyAdminQueryDto) {
    const SORT_COLUMNS: Record<string, string> = { name: 'f.name', title: 'f.title' };
    const sortCol = (query.sort && SORT_COLUMNS[query.sort]) || 'f.name';
    const order = query.order === 'desc' ? 'DESC' : 'ASC';
    const qb = await this.filtered(query);
    qb.orderBy(sortCol, order).addOrderBy('f.id', order === 'DESC' ? 'DESC' : 'ASC');
    const [rows, total] = await qb.take(query.limit).skip(query.offset()).getManyAndCount();
    return offsetPage(rows.map((f) => this.view(f)), query.page, query.limit, total);
  }

  async create(dto: CreateFacultyDto, actorId: string) {
    const departmentId = await this.resolveDepartment(dto.department);
    const saved = await this.faculty.save(
      this.faculty.create({
        name: dto.name,
        department_id: departmentId,
        title: dto.title ?? null,
        research_area: dto.research_area ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        bio: dto.bio ?? null,
        avatar_media_id: dto.avatar_media_id ?? null,
        avatar_url: dto.avatar_url ?? null,
        address: dto.address ?? null,
        homepage: dto.homepage ?? null,
        updated_by: actorId,
      }),
    );
    return this.view(await this.load(saved.id));
  }

  async update(id: string, dto: UpdateFacultyDto, actorId: string) {
    const f = await this.load(id);
    const scalar: Array<keyof UpdateFacultyDto> = ['name', 'title', 'research_area', 'email', 'phone', 'bio', 'avatar_url', 'address', 'homepage'];
    for (const key of scalar) {
      const value = dto[key];
      if (value !== undefined) (f as any)[key] = value === '' ? null : value;
    }
    if (dto.avatar_media_id !== undefined) f.avatar_media_id = dto.avatar_media_id || null;
    if (dto.department !== undefined) f.department_id = await this.resolveDepartment(dto.department);
    f.updated_by = actorId;
    await this.faculty.save(f);
    return this.view(await this.load(id));
  }

  async remove(id: string) {
    const f = await this.load(id);
    await this.faculty.remove(f);
    return { deleted: true };
  }

  // ------------------------------------------------------------------ helpers --

  private async load(id: string): Promise<FacultyMember> {
    const f = await this.faculty.findOne({ where: { id }, relations: { department: true, avatar_media: true } });
    if (!f) throw ApiException.notFound('Faculty member not found');
    return f;
  }

  private async departmentId(raw: string): Promise<string> {
    const dept = /^\d+$/.test(raw)
      ? await this.departments.findOne({ where: { id: raw } })
      : await this.departments.findOne({ where: { code: raw } });
    if (!dept) throw ApiException.validationFailed([{ field: 'department', message: 'unknown department' }]);
    return dept.id;
  }

  private async resolveDepartment(raw?: string): Promise<string | null> {
    if (!raw) return null;
    return this.departmentId(raw);
  }

  private view(f: FacultyMember) {
    return {
      id: f.id,
      name: f.name,
      department: f.department ? { id: f.department.id, code: f.department.code, name_zh: f.department.name_zh, name_en: f.department.name_en } : null,
      department_id: f.department_id,
      title: f.title,
      research_area: f.research_area,
      email: f.email,
      phone: f.phone,
      bio: f.bio,
      avatar_url: f.avatar_media?.url ?? f.avatar_url ?? null,
      address: f.address,
      homepage: f.homepage,
      created_at: f.created_at,
      updated_at: f.updated_at,
    };
  }
}
