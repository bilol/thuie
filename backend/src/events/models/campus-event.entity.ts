import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { EventStatus, EventType, RegistrationStatus } from '../../common/auth.types';
import { MediaObject } from '../../entities';
import { User } from '../../entities';

/** §6.10 campus_events — admin/student-council published events. */
@Entity('campus_events')
export class CampusEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz' })
  starts_at: Date;

  /** API defaults starts_at + 3h when omitted (§6.10). */
  @Column({ type: 'timestamptz', nullable: true })
  ends_at: Date | null;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  organizer: string | null;

  @Column({ type: 'text', default: 'other' })
  type: EventType;

  /** NULL ⇒ uncapped (§6.10). */
  @Column({ type: 'int', nullable: true })
  capacity: number | null;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  cover_media_id: string | null;

  @ManyToOne(() => MediaObject, { nullable: true })
  @JoinColumn({ name: 'cover_media_id' })
  cover_media: MediaObject | null;

  @Column({ type: 'text', default: 'draft' })
  status: EventStatus;

  /** §12.8 — all timestamps stored UTC, displayed in the event's own zone. */
  @Column({ type: 'text', default: 'Asia/Shanghai' })
  timezone: string;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @OneToMany(() => EventRegistration, (r) => r.event)
  registrations: EventRegistration[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}

/**
 * §6.10 event_registrations + ticket state. `ticket_nonce` is the single-use
 * token matched against the HMAC-signed ticket payload; `used_at` makes replay
 * impossible.
 */
@Entity('event_registrations')
export class EventRegistration {
  @PrimaryColumn({ type: 'bigint' })
  event_id: string;

  @ManyToOne(() => CampusEvent, (e) => e.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: CampusEvent;

  @PrimaryColumn({ type: 'bigint' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  registered_at: Date;

  @Column({ type: 'text', default: 'registered' })
  status: RegistrationStatus;

  @Column({ type: 'uuid', nullable: true })
  ticket_nonce: string | null;

  /** Set on check-in ⇒ a second scan of the same ticket is rejected. */
  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;
}
