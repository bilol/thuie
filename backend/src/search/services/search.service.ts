import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import {
  AlumniProfile, CampusEvent, Department, FacultyMember, ForumPost, InfoPost, ProfileSkill, Tag, User,
} from '../../entities';
import { AuthUser } from '../../common/decorators';
import { clampLimit } from '../../common/pagination/cursor';
import { applyVisibility } from '../../common/util/visibility';
import { SearchType, SuggestQueryDto, SuggestScope } from '../dto/search.dto';

/** A hit shape is deliberately loose — the client renders per `type`. */
type SearchItem = Record<string, unknown>;
type Suggestion = { type: 'tag' | 'skill' | 'department' | 'user'; label: string; value: string; avatar_url?: string | null };

/**
 * §6.14 cross-resource search. The contract targets Postgres FTS + `pg_trgm`;
 * the v0 driver (README) is `ILIKE` on the leading text columns, scoped by the
 * §3.1 visibility predicate so hidden rows never surface. `type=all` fans out
 * across every resource and reports a `total_estimate` (per-type counts).
 */
@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(InfoPost) private readonly infos: Repository<InfoPost>,
    @InjectRepository(ForumPost) private readonly posts: Repository<ForumPost>,
    @InjectRepository(AlumniProfile) private readonly alumni: Repository<AlumniProfile>,
    @InjectRepository(CampusEvent) private readonly events: Repository<CampusEvent>,
    @InjectRepository(FacultyMember) private readonly faculty: Repository<FacultyMember>,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    @InjectRepository(ProfileSkill) private readonly skills: Repository<ProfileSkill>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async search(user: AuthUser, query: { q: string; type?: SearchType; limit?: number }) {
    const limit = clampLimit(query.limit);
    const term = `%${query.q}%`;
    const want = (t: SearchType) => !query.type || query.type === 'all' || query.type === t;

    const buckets: SearchItem[] = [];
    if (want('info')) buckets.push(...(await this.searchInfos(user, term, limit)));
    if (want('post')) buckets.push(...(await this.searchPosts(term, limit)));
    if (want('profile')) buckets.push(...(await this.searchProfiles(user, term, limit)));
    if (want('event')) buckets.push(...(await this.searchEvents(term, limit)));
    if (want('faculty')) buckets.push(...(await this.searchFaculty(term, limit)));

    return { data: buckets, meta: { q: query.q, type: query.type ?? 'all', limit, total_estimate: buckets.length } };
  }

  // ---------------------------------------------------------------- per type --

  private async searchInfos(user: AuthUser, term: string, limit: number): Promise<SearchItem[]> {
    const qb = this.infos
      .createQueryBuilder('i')
      .where('i.status = :approved', { approved: 'approved' })
      .andWhere('(i.title ILIKE :q OR i.content ILIKE :q)', { q: term });
    applyVisibility(qb, 'i', user);
    const rows = await this.limited(qb, 'i.created_at', limit);
    return rows.map((i) => ({ type: 'info', id: i.id, title: i.title, subtitle: i.category, url: `/infos/${i.id}` }));
  }

  private async searchPosts(term: string, limit: number): Promise<SearchItem[]> {
    const rows = await this.limited(
      this.posts
        .createQueryBuilder('p')
        .where('p.status = :approved', { approved: 'approved' })
        .andWhere('(p.title ILIKE :q OR p.content ILIKE :q)', { q: term }),
      'p.created_at',
      limit,
    );
    return rows.map((p) => ({ type: 'post', id: p.id, title: p.title, subtitle: null, url: `/posts/${p.id}` }));
  }

  private async searchProfiles(user: AuthUser, term: string, limit: number): Promise<SearchItem[]> {
    const qb = this.alumni
      .createQueryBuilder('a')
      .where('a.status = :approved', { approved: 'approved' })
      .andWhere('(a.display_name ILIKE :q OR a.work_title ILIKE :q OR a.company ILIKE :q OR a.bio ILIKE :q)', { q: term });
    applyVisibility(qb, 'a', user);
    const rows = await this.limited(qb, 'a.updated_at', limit);
    return rows.map((a) => ({
      type: 'profile',
      id: a.id,
      title: a.display_name,
      subtitle: [a.work_title, a.company].filter(Boolean).join(' · ') || null,
      url: `/alumni/${a.id}`,
    }));
  }

  private async searchEvents(term: string, limit: number): Promise<SearchItem[]> {
    const rows = await this.limited(
      this.events
        .createQueryBuilder('e')
        .where('e.status = :published', { published: 'published' })
        .andWhere('(e.title ILIKE :q OR e.description ILIKE :q OR e.location ILIKE :q)', { q: term }),
      'e.starts_at',
      limit,
    );
    return rows.map((e) => ({ type: 'event', id: e.id, title: e.title, subtitle: e.location, url: `/events/${e.id}` }));
  }

  private async searchFaculty(term: string, limit: number): Promise<SearchItem[]> {
    const rows = await this.limited(
      this.faculty
        .createQueryBuilder('f')
        .where('(f.name ILIKE :q OR f.title ILIKE :q OR f.research_area ILIKE :q OR f.bio ILIKE :q)', { q: term }),
      'f.created_at',
      limit,
    );
    return rows.map((f) => ({ type: 'faculty', id: f.id, title: f.name, subtitle: f.title, url: `/faculty/${f.id}` }));
  }

  // ---------------------------------------------------------------- suggest --

  async suggest(query: SuggestQueryDto): Promise<Suggestion[]> {
    const term = `%${query.q}%`;
    const scope: SuggestScope = query.scope ?? 'all';
    const want = (s: SuggestScope) => scope === 'all' || scope === s;
    const out: Suggestion[] = [];

    if (want('tags')) {
      const rows = await this.tags.createQueryBuilder('t').where('t.name ILIKE :q', { q: term }).take(10).getMany();
      rows.forEach((t) => out.push({ type: 'tag', label: t.name, value: t.slug }));
    }
    if (want('skills')) {
      const rows = await this.skills
        .createQueryBuilder('s')
        .select('DISTINCT s.skill', 'skill')
        .where('s.skill ILIKE :q', { q: term })
        .limit(10)
        .getRawMany();
      rows.forEach((r) => out.push({ type: 'skill', label: String(r.skill), value: String(r.skill) }));
    }
    if (want('departments')) {
      const rows = await this.departments
        .createQueryBuilder('d')
        .where('d.name_zh ILIKE :q OR d.name_en ILIKE :q OR d.code ILIKE :q', { q: term })
        .take(10)
        .getMany();
      rows.forEach((d) => out.push({ type: 'department', label: d.name_zh, value: d.id }));
    }
    if (want('users')) {
      const rows = await this.users
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.avatar_media', 'avatar')
        .where('u.name ILIKE :q', { q: term })
        .andWhere("u.status <> 'deleted'")
        .take(10)
        .getMany();
      rows.forEach((u) => out.push({ type: 'user', label: u.name, value: u.id, avatar_url: u.avatar_media?.url ?? null }));
    }
    return out;
  }

  private limited<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, orderCol: string, limit: number): Promise<T[]> {
    return qb.orderBy(orderCol, 'DESC').take(limit).getMany();
  }
}
