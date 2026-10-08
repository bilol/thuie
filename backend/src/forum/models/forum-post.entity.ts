import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { ContentStatus } from '../../common/auth.types';
import { User } from '../../entities';
import { Comment } from '../../entities';

/**
 * §6.8 forum_posts — threads. Counters are cache columns; the truth lives in
 * the junction tables (post_likes / post_views / comments).
 * `last_comment_at` is the feed sort key (post_feed_idx in the DDL).
 */
@Entity('forum_posts')
@Index('post_author_idx', ['author_id', 'status'])
export class ForumPost {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'bigint', transformer: bigint })
  author_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text', default: 'pending' })
  status: ContentStatus;

  @Column({ type: 'text', nullable: true })
  reject_reason: string | null;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'int', default: 0 })
  like_count: number;

  @Column({ type: 'int', default: 0 })
  bookmark_count: number;

  @Column({ type: 'int', default: 0 })
  comment_count: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_comment_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  taken_down_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  edited_at: Date | null;

  @Column({ type: 'int', default: 0 })
  version: number;

  @OneToMany(() => Comment, (c) => c.post)
  comments: Comment[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}
