import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { MediaKind } from '../../common/auth.types';
import { User } from '../../entities';

/** §6.11 + BACKEND §12.5 — uploads registry; physical file lives under MEDIA_DIR/S3. */
@Entity('media_objects')
@Index('media_sha_idx', ['sha256'])
export class MediaObject {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  owner_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  @Column({ type: 'text' })
  kind: MediaKind;

  /** Object key (local path under MEDIA_DIR or S3/OSS key). */
  @Column({ unique: true })
  storage_key: string;

  @Column()
  file_name: string;

  @Column()
  mime_type: string;

  @Column({ type: 'bigint', transformer: bigint })
  size_bytes: string;

  /** Dedup + orphan GC (§8.4). */
  @Column({ type: 'char', length: 64 })
  sha256: string;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Column({ type: 'text', nullable: true })
  thumbnail_key: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  /** Public URL shape served by the media module (§8.3). */
  get url(): string {
    return `/api/v1/media/${this.id}/${encodeURIComponent(this.file_name)}`;
  }

  get thumbnail_url(): string | null {
    return this.thumbnail_key ? `/api/v1/media/${this.id}/thumb` : null;
  }
}
