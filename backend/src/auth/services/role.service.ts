import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleStrategy } from '../models/role-strategy.entity';
import { AuthUser } from '../../common/decorators';
import { Role, StrategyFlag, STRATEGY_FLAGS } from '../../common/auth.types';

/** Flags that gate publishing; absent configuration must not allow them. */
const WRITE_FLAGS: ReadonlySet<StrategyFlag> = new Set<StrategyFlag>([
  'can_submit_info', 'can_post_forum', 'can_comment', 'can_create_profile',
]);

/**
 * BACKEND.md §3.1 — role_strategies is the single gating table read by guards,
 * by `GET /me/role-strategy` (the client drives its UI off this) and by the
 * admin screen. Reads are cached for 60 s (invalidated on write) because every
 * guarded request touches it.
 *
 * Admin roles bypass the table entirely: `role_strategies` models what
 * students/graduates may see, mirroring the client's RoleStrategy defaults.
 */
@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);
  private cache = new Map<Role, RoleStrategy>();
  private cachedAt = 0;
  private static readonly TTL_MS = 60_000;

  constructor(
    @InjectRepository(RoleStrategy) private readonly repo: Repository<RoleStrategy>,
  ) {}

  async all(): Promise<RoleStrategy[]> {
    await this.ensureFresh();
    return [...this.cache.values()].sort((a, b) => a.role.localeCompare(b.role));
  }

  async forRole(role: Role): Promise<RoleStrategy | null> {
    await this.ensureFresh();
    return this.cache.get(role) ?? null;
  }

  /** Guard-facing check: admins pass, everyone else consults the flag. */
  async userHasFlag(user: AuthUser, flag: StrategyFlag): Promise<boolean> {
    if (user.is_admin) return true;
    const strategy = await this.forRole(user.role);
    // A missing row fails open on view flags but closed on write flags, so a
    // mis-seeded database can never silently publish content.
    if (!strategy) {
      this.logger.warn(`role_strategies row missing for role=${user.role}; write flags default to false`);
      return !WRITE_FLAGS.has(flag);
    }
    return strategy.has(flag);
  }

  /** Called by the admin write path so the next read sees new values. */
  invalidate(): void {
    this.cache.clear();
    this.cachedAt = 0;
  }

  /**
   * §6.17 admin_super-only role-strategy write. Only the boolean flags and the
   * `updated_by` audit column are touched; the `role` PK is immutable.
   */
  async update(
    role: Role,
    patch: Partial<Record<StrategyFlag, boolean>>,
    actorId: string,
  ): Promise<RoleStrategy | null> {
    const row = await this.repo.findOne({ where: { role } });
    if (!row) return null;
    for (const flag of STRATEGY_FLAGS) {
      if (patch[flag] !== undefined) row[flag] = patch[flag] as boolean;
    }
    row.updated_by = actorId;
    const saved = await this.repo.save(row);
    this.invalidate();
    return saved;
  }

  private async ensureFresh(): Promise<void> {
    if (Date.now() - this.cachedAt < RoleService.TTL_MS && this.cache.size > 0) return;
    const rows = await this.repo.find();
    this.cache = new Map(rows.map((r) => [r.role, r]));
    this.cachedAt = Date.now();
  }
}
