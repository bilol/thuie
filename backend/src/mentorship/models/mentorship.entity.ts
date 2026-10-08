import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { MentorProfileStatus, MentorshipStatus } from '../../common/auth.types';
import { User } from '../../entities';

/** §6.10 mentor_profiles — a graduate/opt-in mentor offering expertise areas. */
@Entity('mentor_profiles')
export class MentorProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', unique: true, transformer: bigint })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  expertise: string;

  @Column({ type: 'text', nullable: true })
  mentor_area: string | null;

  @Column({ type: 'int', default: 3 })
  max_mentees: number;

  @Column({ type: 'text', default: 'pending' })
  status: MentorProfileStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}

/**
 * §6.10 mentorship_applications — the DDL partial unique index
 * mentorship_active_pair_uniq guarantees at most one pending/accepted row
 * per mentor-mentee pair.
 */
@Entity('mentorship_applications')
@Index('mentorship_mentee_idx', ['mentee_user_id', 'status'])
export class MentorshipApplication {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  mentor_user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_user_id' })
  mentor: User;

  @Column({ type: 'bigint', transformer: bigint })
  mentee_user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentee_user_id' })
  mentee: User;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'text', default: 'pending' })
  status: MentorshipStatus;

  @Column({ type: 'timestamptz', nullable: true })
  responded_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
