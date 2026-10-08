import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Role, StrategyFlag, STRATEGY_FLAGS } from '../../common/auth.types';

/**
 * §6.5 role_strategies — per-role boolean feature flags, 1:1 with the Flutter
 * client's RoleStrategy. Seeded in 002_reference_data.sql, edited only by
 * admin_super (BACKEND §3.1 / §7.16.6).
 */
@Entity('role_strategies')
export class RoleStrategy {
  @PrimaryColumn({ type: 'text' })
  role: Role;

  @Column({ type: 'boolean', default: true })
  can_view_info: boolean;

  @Column({ type: 'boolean', default: false })
  can_view_internal: boolean;

  @Column({ type: 'boolean', default: true })
  can_view_alumni: boolean;

  @Column({ type: 'boolean', default: true })
  can_view_forum: boolean;

  @Column({ type: 'boolean', default: true })
  can_submit_info: boolean;

  @Column({ type: 'boolean', default: true })
  can_post_forum: boolean;

  @Column({ type: 'boolean', default: true })
  can_comment: boolean;

  @Column({ type: 'boolean', default: true })
  can_create_profile: boolean;

  @Column({ type: 'bigint', nullable: true })
  updated_by: string | null;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  has(flag: StrategyFlag): boolean {
    return Boolean(this[flag]);
  }

  /** Client-facing object keyed like the Dart RoleStrategy (camelCase). */
  toClientShape(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const f of STRATEGY_FLAGS) out[f.replace(/_([a-z])/g, (_m, c) => c.toUpperCase())] = Boolean(this[f]);
    return out;
  }
}
