import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { bigint } from '../../common/util/column';
import { Role } from '../../common/auth.types';
import { User } from '../../entities';

/** §6.12 identity_change_logs — who flipped whose role, and why (§7.16.4). */
@Entity('identity_change_logs')
export class IdentityChangeLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  from_role: Role;

  @Column({ type: 'text' })
  to_role: Role;

  @Column({ type: 'bigint', transformer: bigint })
  actor_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

/**
 * §6.12 operation_logs — append-only admin audit trail. `detail` holds only
 * allowlisted safe fields (never passwords/tokens); BRIN index on created_at.
 */
@Entity('operation_logs')
@Index('operation_logs_brin', ['created_at'])
export class OperationLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  admin_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  /** Dotted action verb: user.restrict, keyword.create, post.takedown, … */
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'text', nullable: true })
  target_type: string | null;

  @Column({ type: 'bigint', nullable: true })
  target_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @Column({ type: 'inet', nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
