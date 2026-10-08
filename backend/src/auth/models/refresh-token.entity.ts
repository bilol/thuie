import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { User } from '../../entities';

/** §6.5 + BACKEND §12.3 — device sessions; rotation with reuse-detection families. */
@Entity('refresh_tokens')
@Index('refresh_user_idx', ['user_id'])
export class RefreshToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** sha256 of the opaque token; plaintext never persists. */
  @Column({ unique: true, type: 'char', length: 64 })
  token_hash: string;

  @Column({ type: 'text', nullable: true })
  device_label: string | null;

  @Column({ type: 'inet', nullable: true })
  ip: string | null;

  /** Rotation family — reuse of an old token revokes the whole family (§3.3). */
  @Column({ type: 'uuid' })
  family_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  get active(): boolean {
    return !this.revoked_at && this.expires_at > new Date();
  }
}
