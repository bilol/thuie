import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { Role, UserStatus, Visibility } from '../../common/auth.types';
import { Department } from '../../entities';
import { MediaObject } from '../../entities';
import { AlumniProfile } from '../../entities';

/** §6.5 users — identity, role, login handles, lifecycle status. */
@Entity('users')
@Index('users_role_idx', ['role'])
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'text' })
  role: Role;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Tsinghua student number; login handle for students. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  student_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  /** NULL ⇒ cannot log in (system user). Never selected into responses. */
  @Column({ type: 'text', nullable: true, select: false })
  password_hash: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  department_id: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  /** Program code (MEM / IMEM / GMA) — belongs to the person, so students carry it too. */
  @Column({ type: 'text', nullable: true })
  program: string | null;

  /** Nationality — an attribute of the person, not the directory listing (§6.5). */
  @Column({ type: 'text', nullable: true })
  nationality: string | null;

  @Column({ type: 'varchar', length: 9, nullable: true })
  grade_year: string | null;

  /** Set on student→graduate conversion (§6.14). */
  @Column({ type: 'varchar', length: 9, nullable: true })
  graduation_year: string | null;

  @Column({ type: 'text', default: 'active' })
  status: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  phone_verified_at: Date | null;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  avatar_media_id: string | null;

  @ManyToOne(() => MediaObject, { nullable: true })
  @JoinColumn({ name: 'avatar_media_id' })
  avatar_media: MediaObject | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  /** Contact channels that belong to the person (§6.5). Published to the alumni
   *  directory only when the matching `*_visibility` below allows the audience. */
  @Column({ type: 'text', nullable: true })
  wechat: string | null;

  @Column({ type: 'text', nullable: true })
  whatsapp: string | null;

  @Column({ type: 'text', nullable: true })
  linkedin: string | null;

  /** Per-field publication audience for the WeChat handle (§3.1). 'admin_only' = only me. */
  @Column({ type: 'text', default: 'admin_only' })
  wechat_visibility: Visibility;

  /** Per-field publication audience for the WhatsApp handle (§3.1). 'admin_only' = only me. */
  @Column({ type: 'text', default: 'admin_only' })
  whatsapp_visibility: Visibility;

  /** Per-field publication audience for the LinkedIn URL (§3.1). 'admin_only' = only me. */
  @Column({ type: 'text', default: 'admin_only' })
  linkedin_visibility: Visibility;

  /** Per-field publication audience for the account email/phone (§3.1). These gate
   *  publication of the account's own email/phone to the alumni directory. */
  @Column({ type: 'text', default: 'admin_only' })
  email_visibility: Visibility;

  @Column({ type: 'text', default: 'admin_only' })
  phone_visibility: Visibility;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date | null;

  /** Access tokens with iat older than this are rejected (§6.5). */
  @Column({ type: 'timestamptz', nullable: true })
  password_changed_at: Date | null;

  /** Soft delete + PII scrub (§6.13). */
  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  /** Own profile in the alumni directory (1:1, §6.7). */
  @OneToOne(() => AlumniProfile, (p) => p.user, { nullable: true })
  alumni_profile: AlumniProfile | null;

  get is_admin(): boolean {
    return this.role === 'admin' || this.role === 'admin_super';
  }

  /** Shape for req.user after JWT validation. */
  toAuthUser(): { id: string; role: Role; name: string; department_id: string | null; status: UserStatus; is_admin: boolean } {
    return {
      id: this.id,
      role: this.role,
      name: this.name,
      department_id: this.department_id,
      status: this.status,
      is_admin: this.is_admin,
    };
  }
}
