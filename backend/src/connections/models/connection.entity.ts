import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { ConnectionStatus } from '../../common/auth.types';
import { User } from '../../entities';

/**
 * §6.9 connections — a directed request row that flips to accepted when the
 * target responds. Accepted pairs are queryable in both directions via
 * connections_accepted_idx (the service unions from_/to_).
 */
@Entity('connections')
export class Connection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  from_user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_user_id' })
  from_user: User;

  @Column({ type: 'bigint', transformer: bigint })
  to_user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_user_id' })
  to_user: User;

  @Column({ type: 'text', default: 'pending' })
  status: ConnectionStatus;

  /** Optional note attached to the request. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  message: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  responded_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}

/** §12.7 blocks — hides the blocked user everywhere and forbids DMs. */
@Entity('blocks')
export class Block {
  @PrimaryColumn({ type: 'bigint' })
  blocker_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @PrimaryColumn({ type: 'bigint' })
  blocked_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_id' })
  blocked: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
