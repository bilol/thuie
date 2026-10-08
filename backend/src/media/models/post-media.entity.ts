import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MediaKind, MediaOwnerType } from '../../common/auth.types';
import { MediaObject } from '../../entities';

/**
 * §6.11 post_media — polymorphic media attachment for info posts, forum posts
 * and alumni profiles. Integrity of (owner_type, owner_id) is app-enforced,
 * as in the rest of the schema. UNIQUE(owner_type, owner_id, media_id) is the
 * entity identity here (the DDL declares no surrogate PK).
 */
@Entity('post_media')
export class PostMedia {
  @PrimaryColumn({ type: 'text' })
  owner_type: MediaOwnerType;

  @PrimaryColumn({ type: 'bigint' })
  owner_id: string;

  @PrimaryColumn({ type: 'bigint' })
  media_id: string;

  @ManyToOne(() => MediaObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: MediaObject;

  @Column({ type: 'text' })
  kind: MediaKind;

  /** Ordered display position within the owner's gallery. */
  @Column({ type: 'int', default: 0 })
  position: number;
}
