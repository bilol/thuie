import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** §6.5 departments — seeded from the school registry (002_reference_data.sql). */
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name_zh: string;

  @Column()
  name_en: string;

  @Column({ type: 'text', nullable: true })
  faculty: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
