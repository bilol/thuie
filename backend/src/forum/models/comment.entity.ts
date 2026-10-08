import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { ContentStatus } from '../../common/auth.types';
import { ForumPost } from '../../entities';
import { User } from '../../entities';

/**
 * §6.8 comments — one nesting level (parent_id) plus a denormalized root_id so
 * a whole thread is one indexed fetch (comments_thread_idx).
 */
@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  forum_post_id: string;

  @ManyToOne(() => ForumPost, (p) => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'forum_post_id' })
  post: ForumPost;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  parent_id: string | null;

  @ManyToOne(() => Comment, (c) => c.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment | null;

  @OneToMany(() => Comment, (c) => c.parent)
  replies: Comment[];

  /** Top-level ancestor; equals own id for root comments. */
  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  root_id: string | null;

  @Column({ type: 'bigint', transformer: bigint })
  author_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  content: string;

  /** Comments are published immediately; taken_down happens on moderation (§6.8). */
  @Column({ type: 'text', default: 'approved' })
  status: ContentStatus;

  @Column({ type: 'text', nullable: true })
  reject_reason: string | null;

  @Column({ type: 'int', default: 0 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}
