import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TargetType } from '../../common/auth.types';
import { User } from '../../entities';

/**
 * §6.11 favorites (bookmarks) — keyed by the polymorphic
 * (target_type, target_id) pair the client already uses, so one table serves
 * infos / posts / profiles / comments. The composite PK makes a repeat insert
 * idempotent; forum bookmark toggles reuse this same row (§6.7).
 */
@Entity('favorites')
export class Favorite {
  @PrimaryColumn({ type: 'bigint' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @PrimaryColumn({ type: 'text' })
  target_type: TargetType;

  @PrimaryColumn({ type: 'bigint' })
  target_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
