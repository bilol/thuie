import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import {
  FeedbackStatus, KeywordAction, ModerationTargetType, NotificationType,
  ReportStatus, ReportTargetType,
} from '../../common/auth.types';
import { User } from '../../entities';

/**
 * §6.12 trust & moderation. `ModerationAction` is the append-only lifecycle
 * audit for every moderatable entity; `Report` is the user-raised queue;
 * `Keyword` drives the pre-publish filter (block | manual_review).
 */
@Entity('keywords')
export class Keyword {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  word: string;

  @Column({ type: 'text' })
  action: KeywordAction;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

/** action values: submitted|approved|rejected|taken_down|removed|resubmitted. */
@Entity('moderation_actions')
@Index('moderation_target_idx', ['target_type', 'target_id'])
export class ModerationAction {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'text' })
  target_type: ModerationTargetType;

  @Column({ type: 'bigint' })
  target_id: string;

  /** NULL = keyword engine / system acted, not a human (§6.12). */
  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  actor_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'text' })
  action: 'submitted' | 'approved' | 'rejected' | 'taken_down' | 'removed' | 'resubmitted';

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

@Entity('reports')
@Index('reports_queue_idx', ['status', 'created_at'])
export class Report {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  reporter_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ type: 'text' })
  target_type: ReportTargetType;

  @Column({ type: 'bigint' })
  target_id: string;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @Column({ type: 'text', default: 'open' })
  status: ReportStatus;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  resolved_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User | null;

  /** Propagated to the reporter as a `report_result` notification (§6.12). */
  @Column({ type: 'text', nullable: true })
  result_note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

/** In-app feedback (Me → Feedback), handled by admins. */
@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  reply: string | null;

  @Column({ type: 'text', default: 'open' })
  status: FeedbackStatus;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  handled_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'handled_by' })
  handler: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  handled_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ type: 'bigint' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @PrimaryColumn({ type: 'text' })
  type: NotificationType;

  @Column({ type: 'boolean', default: false })
  muted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date | null;
}
