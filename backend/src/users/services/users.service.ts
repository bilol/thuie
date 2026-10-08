import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { StudentRegistry, User } from '../../entities';
import { Role, UserStatus } from '../../common/auth.types';

/** Relations almost every read needs: department (name) + avatar (url). */
const DEFAULT_RELATIONS: FindOptionsRelations<User> = {
  department: true,
  avatar_media: true,
};

/**
 * §6.5 users — read/write access. Login handles are partial-unique among live
 * rows, so every lookup excludes `deleted_at IS NOT NULL` implicitly through
 * `status <> 'deleted'` filters on the caller side.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(StudentRegistry) private readonly registry: Repository<StudentRegistry>,
  ) {}

  findById(id: string, relations: FindOptionsRelations<User> = DEFAULT_RELATIONS): Promise<User | null> {
    return this.users.findOne({ where: { id }, relations });
  }

  /** Orphan id guard for feeds: brief shape, no PII. */
  findMany(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.users.find({ where: ids.map((id) => ({ id })), relations: DEFAULT_RELATIONS });
  }

  /** Login handle resolution — any of student_id / phone / email (§3). */
  findByHandle(handle: string): Promise<User | null> {
    return this.users
      .findOne({ where: [{ student_id: handle }, { phone: handle }, { email: handle }], relations: DEFAULT_RELATIONS })
      .then((u) => this.withHash(u));
  }

  /** `select: false` columns must be pulled explicitly. */
  private async withHash(user: User | null): Promise<User | null> {
    if (!user) return null;
    const fresh = await this.users.findOne({
      where: { id: user.id },
      select: { password_hash: true },
    });
    if (fresh) user.password_hash = fresh.password_hash;
    return user;
  }

  existsHandle(handle: string): Promise<boolean> {
    return this.users
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL')
      .andWhere('(u.student_id = :h OR u.phone = :h OR u.email = :h)', { h: handle })
      .getCount()
      .then((n) => n > 0);
  }

  create(data: Partial<User>): Promise<User> {
    return this.users.save(this.users.create(data));
  }

  save(user: User): Promise<User> {
    return this.users.save(user);
  }

  /** Registry lookup backing §3.2 student signups. */
  registryEntry(studentId: string): Promise<StudentRegistry | null> {
    return this.registry.findOne({ where: { student_id: studentId } });
  }

  claimRegistryEntry(studentId: string, userId: string): Promise<unknown> {
    return this.registry.update({ student_id: studentId }, { claimed_user_id: userId });
  }

  /** Admin list/search (§6.17). */
  search(opts: { role?: Role; status?: UserStatus; q?: string; program?: string; nationality?: string; sort?: string; order?: 'asc' | 'desc'; take: number; skip: number }): Promise<[User[], number]> {
    const qb = this.users.createQueryBuilder('u').where('u.deleted_at IS NULL');
    if (opts.role) qb.andWhere('u.role = :role', { role: opts.role });
    if (opts.status) qb.andWhere('u.status = :status', { status: opts.status });
    if (opts.q) {
      qb.andWhere('(u.name ILIKE :q OR u.student_id ILIKE :q OR u.email ILIKE :q OR u.phone ILIKE :q)', { q: `%${opts.q}%` });
    }
    // Program is exact, case-insensitive (no wildcards): a substring test would
    // let 'MEM' wrongly match 'IMEM' — same semantics as the directory filter.
    if (opts.program) qb.andWhere('u.program ILIKE :program', { program: opts.program });
    // Nationality is an ISO code set from a fixed select, so match it exactly
    // (case-insensitive, no wildcards) — a substring test would cross-match codes.
    if (opts.nationality) qb.andWhere('u.nationality ILIKE :nationality', { nationality: opts.nationality });
    // Whitelisted column map — never interpolate a raw client string into ORDER BY.
    const SORT_COLUMNS: Record<string, string> = {
      name: 'u.name',
      program: 'u.program',
      department: 'department.name_en',
      role: 'u.role',
      status: 'u.status',
      created_at: 'u.created_at',
    };
    const sortCol = (opts.sort && SORT_COLUMNS[opts.sort]) || 'u.created_at';
    const dir = opts.order === 'asc' ? 'ASC' : 'DESC';
    return qb
      .leftJoinAndSelect('u.department', 'department')
      .leftJoinAndSelect('u.avatar_media', 'avatar_media')
      .orderBy(sortCol, dir).take(opts.take).skip(opts.skip).getManyAndCount();
  }

  /** §6.13 soft delete: status flip + PII scrub happens in the nightly job. */
  softDelete(id: string): Promise<unknown> {
    return this.users.update(
      { id },
      { status: 'deleted', deleted_at: new Date(), student_id: null, phone: null, email: null, password_hash: null },
    );
  }

  touchLastLogin(id: string): Promise<unknown> {
    return this.users.update({ id }, { last_login_at: new Date() });
  }
}
