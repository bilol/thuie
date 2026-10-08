import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** §3.2 / BACKEND §12.10 — pre-imported roster gating student signups. */
@Entity('student_registry')
export class StudentRegistry {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  student_id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  department_code: string | null;

  @Column({ type: 'varchar', length: 9, nullable: true })
  grade_year: string | null;

  /** Set when the student claims the account. */
  @Column({ type: 'bigint', nullable: true })
  claimed_user_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  imported_at: Date;
}
