import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { Department } from '../../entities';
import { MediaObject } from '../../entities';
import { User } from '../../entities';

/** §6.7 faculty_members — directory-only, admin-maintained, no account link. */
@Entity('faculty_members')
export class FacultyMember {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  department_id: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  research_area: string | null;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  avatar_media_id: string | null;

  @ManyToOne(() => MediaObject, { nullable: true })
  @JoinColumn({ name: 'avatar_media_id' })
  avatar_media: MediaObject | null;

  /**
   * External avatar URL (hotlink). Kept alongside the upload-backed
   * `avatar_media`: the directory prefers the uploaded media object when present,
   * else falls back to this string (§6.7). Lets admins paste a photo link without
   * running it through the upload pipeline.
   */
  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  /** Office address from the official directory detail page (§6.7). */
  @Column({ type: 'text', nullable: true })
  address: string | null;

  /** Personal homepage URL from the official directory detail page (§6.7). */
  @Column({ type: 'text', nullable: true })
  homepage: string | null;

  /** Audit: which admin last touched the row (§6.7). */
  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  updated_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}
