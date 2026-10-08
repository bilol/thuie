import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { ContentStatus, InfoCategory, InfoSource, Visibility } from '../../common/auth.types';
import { Department } from '../../entities';
import { User } from '../../entities';

/** §6.6 info_posts — the information board (official notices + user submissions). */
@Entity('info_posts')
@Index('info_author_idx', ['author_id', 'status'])
export class InfoPost {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text' })
  category: InfoCategory;

  /** 'official' skips review (§6.6). */
  @Column({ type: 'text' })
  source: InfoSource;

  @Column({ type: 'text', default: 'all' })
  visibility: Visibility;

  @Column({ type: 'text', default: 'pending' })
  status: ContentStatus;

  @Column({ type: 'bigint', transformer: bigint })
  author_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  department_id: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ type: 'text', nullable: true })
  reject_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  taken_down_at: Date | null;

  /** Non-NULL ⇒ edited after approval, re-enters review (§6.6). */
  @Column({ type: 'timestamptz', nullable: true })
  edited_at: Date | null;

  /** Optimistic concurrency (BACKEND §2 / §12.4). */
  @Column({ type: 'int', default: 0 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}
