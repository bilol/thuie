import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne,
  PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { ProfileSource, ProfileStatus, Visibility } from '../../common/auth.types';
import { Department } from '../../entities';
import { MediaObject } from '../../entities';
import { User } from '../../entities';

/** §6.7 alumni_profiles — directory entry; user-owned or school-official (user_id NULL). */
@Entity('alumni_profiles')
@Index('alumni_browse_idx', ['department_id', 'graduation_year'])
export class AlumniProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  user_id: string | null;

  @OneToOne(() => User, (u) => u.alumni_profile, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 100 })
  display_name: string;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  department_id: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ type: 'varchar', length: 9, nullable: true })
  graduation_year: string | null;

  @Column({ type: 'varchar', length: 9, nullable: true })
  grade_year: string | null;


  @Column({ type: 'text', nullable: true })
  industry: string | null;

  @Column({ type: 'text', nullable: true })
  country: string | null;

  @Column({ type: 'text', nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  nationality: string | null;

  @Column({ type: 'text', nullable: true })
  work_title: string | null;

  @Column({ type: 'text', nullable: true })
  company: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  avatar_media_id: string | null;

  @ManyToOne(() => MediaObject, { nullable: true })
  @JoinColumn({ name: 'avatar_media_id' })
  avatar_media: MediaObject | null;

  @Column({ type: 'text', default: 'all' })
  visibility: Visibility;

  @Column({ type: 'text', default: 'user' })
  source: ProfileSource;

  @Column({ type: 'text', default: 'draft' })
  status: ProfileStatus;

  @Column({ type: 'text', nullable: true })
  reject_reason: string | null;

  @Column({ type: 'int', default: 0 })
  version: number;

  @OneToMany(() => ProfileSkill, (s) => s.profile)
  skills: ProfileSkill[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}

/** §6.7 profile_skills — (alumni_profile_id, skill) PK; GIN trigram index lives in the DDL. */
@Entity('profile_skills')
export class ProfileSkill {
  @PrimaryColumn({ type: 'bigint' })
  alumni_profile_id: string;

  @ManyToOne(() => AlumniProfile, (p) => p.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alumni_profile_id' })
  profile: AlumniProfile;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  skill: string;
}
