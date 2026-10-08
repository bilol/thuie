import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** §6.8 tags — controlled vocabulary for forum posts. */
@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ unique: true })
  name: string;

  /** URL-safe, lowercased, unique (§7.7 filter by ?tag=slug). */
  @Column({ unique: true })
  slug: string;

  static slugify(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  }
}
