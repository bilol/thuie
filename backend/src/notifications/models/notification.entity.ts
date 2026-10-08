import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { bigint } from '../../common/util/column';
import { NotificationType } from '../../common/auth.types';
import { User } from '../../entities';

/**
 * §6.12 notifications — the in-app inbox. `read_at` is a timestamp (not a
 * boolean) so "mark all read" is a single UPDATE; `payload` carries the deep
 * link {route, targetType, targetId} the Flutter router consumes.
 */
@Entity('notifications')
@Index('notifications_inbox_idx', ['recipient_id', 'created_at'])
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  recipient_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'text' })
  type: NotificationType;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  get unread(): boolean {
    return this.read_at === null;
  }
}
