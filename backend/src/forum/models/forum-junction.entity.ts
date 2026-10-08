import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../entities';
import { ForumPost } from '../../entities';
import { Tag } from '../../entities';

/**
 * §6.8 forum junctions — the truth behind the cache counters.
 * All three are composite-PK join tables with ON DELETE CASCADE.
 */

@Entity('post_tags')
export class PostTag {
  @PrimaryColumn({ type: 'bigint' })
  post_id: string;

  @ManyToOne(() => ForumPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @PrimaryColumn({ type: 'bigint' })
  tag_id: string;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}

@Entity('post_likes')
export class PostLike {
  @PrimaryColumn({ type: 'bigint' })
  post_id: string;

  @ManyToOne(() => ForumPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @PrimaryColumn({ type: 'bigint' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

/** §6.8 post_views — one row per unique viewer; recordView is idempotent. */
@Entity('post_views')
export class PostView {
  @PrimaryColumn({ type: 'bigint' })
  post_id: string;

  @ManyToOne(() => ForumPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @PrimaryColumn({ type: 'bigint' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  viewed_at: Date;
}
